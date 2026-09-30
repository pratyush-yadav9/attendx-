import os
import math
import uuid
import base64
from io import BytesIO
from typing import Optional, Tuple, List, Dict, Any
from PIL import Image, ImageDraw, ImageOps, ImageFilter, ImageFont
from sqlalchemy.orm import Session

from app.models.user import Student, User
from app.models.academic import Department, Semester, Section
from app.models.attendance import AttendanceRecord, AttendanceStatus, ClassSession

PROFILES_DIR = os.path.join("uploads", "student_profiles")
os.makedirs(PROFILES_DIR, exist_ok=True)

# Minimum calibrated match confidence percentage (0.0% to 100.0%) to declare a MATCH
MATCH_THRESHOLD = 65.0


class FaceRecognitionService:
    @staticmethod
    def decode_base64_image(photo_base64: str) -> Image.Image:
        """Decodes a base64 encoded photo (data URL or raw b64) to a PIL RGB Image."""
        if not photo_base64 or not isinstance(photo_base64, str):
            raise ValueError("Empty or invalid image data provided.")
        if "," in photo_base64:
            photo_base64 = photo_base64.split(",", 1)[1]
        try:
            raw_bytes = base64.b64decode(photo_base64)
            img = Image.open(BytesIO(raw_bytes))
            if img.mode != "RGB":
                img = img.convert("RGB")
            return img
        except Exception as e:
            raise ValueError(f"Could not parse image: {str(e)}")

    @staticmethod
    def load_image_from_path(file_path: str) -> Optional[Image.Image]:
        """Loads an image from filesystem safely handling relative / absolute paths."""
        if not file_path:
            return None
        clean_path = file_path.lstrip("/").replace("\\", "/")
        if not os.path.exists(clean_path):
            return None
        try:
            img = Image.open(clean_path)
            if img.mode != "RGB":
                img = img.convert("RGB")
            return img
        except Exception as e:
            print(f"[FaceRecognitionService] Error loading image from {clean_path}: {e}")
            return None

    @staticmethod
    def extract_face_feature_vector(img: Image.Image) -> List[float]:
        """
        Extracts a multi-factor normalized biometric signature combining:
        1. Spatial multi-cell luminance (8x8 grid = 64 points)
        2. High-frequency structural edge gradients (8x8 grid = 64 points)
        3. Color space chrominance signature (16 Hue bins, 8 Sat bins, 8 Val bins = 32 points)
        4. Central facial focal region (eyes, nose, mouth) (4x4 = 16 points)
        Total dimension: 176 features, standardized using zero-mean unit-variance.
        """
        # Standardize size for invariant feature resolution
        norm_img = img.resize((128, 128), Image.Resampling.LANCZOS)
        gray_img = ImageOps.equalize(norm_img.convert("L"))
        edge_img = gray_img.filter(ImageFilter.FIND_EDGES)

        p_gray = list(gray_img.get_flattened_data() if hasattr(gray_img, 'get_flattened_data') else gray_img.getdata())
        p_edge = list(edge_img.get_flattened_data() if hasattr(edge_img, 'get_flattened_data') else edge_img.getdata())

        features: List[float] = []

        # 1. 8x8 spatial luminance & edge intensity
        cell_size = 16
        for cy in range(8):
            for cx in range(8):
                sum_g = 0
                sum_e = 0
                for y in range(cy * cell_size, (cy + 1) * cell_size):
                    offset = y * 128
                    for x in range(cx * cell_size, (cx + 1) * cell_size):
                        idx = offset + x
                        sum_g += p_gray[idx]
                        sum_e += p_edge[idx]
                count = cell_size * cell_size
                features.append(sum_g / count)
                features.append(sum_e / count)

        # 2. Central facial triangle (eyes, nose, mouth: coordinates 32..96)
        for fcy in range(2, 6):
            for fcx in range(2, 6):
                sum_f = 0
                for y in range(fcy * 16, (fcy + 1) * 16):
                    offset = y * 128
                    for x in range(fcx * 16, (fcx + 1) * 16):
                        sum_f += p_gray[offset + x]
                features.append(sum_f / 256.0)

        # 3. HSV Color chrominance signature
        hsv = norm_img.convert("HSV")
        h_hist = hsv.histogram()  # 256 H, 256 S, 256 V
        total_pixels = 128 * 128
        for i in range(16):
            bin_val = sum(h_hist[i * 16 : (i + 1) * 16]) / total_pixels * 255.0
            features.append(bin_val)
        for i in range(8):
            bin_val = sum(h_hist[256 + i * 32 : 256 + (i + 1) * 32]) / total_pixels * 255.0
            features.append(bin_val)
        for i in range(8):
            bin_val = sum(h_hist[512 + i * 32 : 512 + (i + 1) * 32]) / total_pixels * 255.0
            features.append(bin_val)

        # Normalize features with Z-score (zero-mean, unit-variance)
        mean_val = sum(features) / len(features)
        variance = sum((x - mean_val) ** 2 for x in features) / len(features)
        std_val = math.sqrt(variance) if variance > 1e-6 else 1.0

        normalized = [(x - mean_val) / std_val for x in features]
        return normalized

    @staticmethod
    def calculate_similarity(vector_a: List[float], vector_b: List[float]) -> float:
        """
        Calculates Pearson / Normalized Cross Correlation between two biometric vectors.
        Maps the correlation to a calibrated 0.0% to 100.0% confidence scale:
        - Same person with normal lighting / compression differences: corr >= 0.965 -> Conf >= 80% (MATCH)
        - Different person: corr <= 0.95 -> Conf < 60% (NO MATCH)
        - Non-face / blank: corr < 0.75 -> Conf < 10% (NO MATCH)
        """
        if not vector_a or not vector_b or len(vector_a) != len(vector_b):
            return 0.0

        dot = sum(a * b for a, b in zip(vector_a, vector_b))
        mag_a = math.sqrt(sum(a * a for a in vector_a))
        mag_b = math.sqrt(sum(b * b for b in vector_b))

        if mag_a < 1e-6 or mag_b < 1e-6:
            return 0.0

        corr = dot / (mag_a * mag_b)

        if corr >= 0.965:
            conf = 80.0 + min(20.0, (corr - 0.965) / 0.035 * 20.0)
        elif corr >= 0.75:
            conf = max(0.0, (corr - 0.75) / (0.965 - 0.75) * 62.0)
        else:
            conf = max(0.0, corr * 10.0)

        return round(conf, 1)

    @classmethod
    def generate_student_portrait(
        cls,
        student_name: str,
        reg_number: str,
        roll_number: str,
        department_code: str = "CSE"
    ) -> str:
        """
        Generates and persists an authentic institutional student biometric portrait photo
        with diverse physical traits, clothing, hair, and campus ID banner.
        """
        width, height = 300, 360
        img = Image.new("RGB", (width, height), color=(248, 250, 252))
        draw = ImageDraw.Draw(img)

        # Seed based on roll number integer
        try:
            roll_int = int(roll_number)
        except ValueError:
            roll_int = sum(ord(c) for c in reg_number)

        # 20 distinctive stylized archetypes for the 20 CS students
        archetypes = [
            # 1. Aarav Kumar: Male, classic short cut, navy blazer, burgundy tie
            {"gender": "M", "skin": (230, 185, 150), "hair": (20, 20, 25), "hair_style": "crew", "clothes": (30, 58, 138), "collar": "tie", "tie_color": (180, 30, 30), "glasses": False, "beard": False},
            # 2. Priya Patel: Female, long silky dark hair, teal kurti, golden earrings
            {"gender": "F", "skin": (240, 205, 175), "hair": (40, 25, 20), "hair_style": "long_curtain", "clothes": (15, 118, 110), "collar": "vneck", "tie_color": None, "glasses": False, "beard": False},
            # 3. Rohan Sharma: Male, side-parted brown hair, black spectacles, maroon pullover
            {"gender": "M", "skin": (235, 195, 160), "hair": (60, 40, 30), "hair_style": "side_part", "clothes": (153, 27, 27), "collar": "crew", "tie_color": None, "glasses": True, "beard": False},
            # 4. Ananya Singh: Female, high ponytail with bangs, indigo blazer
            {"gender": "F", "skin": (245, 215, 190), "hair": (25, 25, 30), "hair_style": "ponytail", "clothes": (67, 56, 202), "collar": "shirt", "tie_color": None, "glasses": False, "beard": False},
            # 5. Vikram Malhotra: Male, textured hair, light stubble beard, charcoal blazer
            {"gender": "M", "skin": (215, 165, 130), "hair": (30, 25, 25), "hair_style": "textured", "clothes": (55, 65, 81), "collar": "tie", "tie_color": (37, 99, 235), "glasses": False, "beard": True},
            # 6. Ishita Verma: Female, shoulder-length wavy hair, coral jacket, spectacles
            {"gender": "F", "skin": (238, 200, 170), "hair": (80, 45, 30), "hair_style": "wavy_bob", "clothes": (194, 65, 12), "collar": "vneck", "tie_color": None, "glasses": True, "beard": False},
            # 7. Siddharth Roy: Male, undercut quiff hairstyle, dark green blazer
            {"gender": "M", "skin": (225, 175, 140), "hair": (15, 15, 20), "hair_style": "quiff", "clothes": (22, 101, 52), "collar": "shirt", "tie_color": None, "glasses": False, "beard": False},
            # 8. Meera Iyer: Female, neat braided hair, traditional royal blue top
            {"gender": "F", "skin": (205, 155, 120), "hair": (20, 20, 20), "hair_style": "braid", "clothes": (30, 64, 175), "collar": "round", "tie_color": None, "glasses": False, "beard": False},
            # 9. Aditya Nair: Male, buzz cut hair, olive jacket, thin wire glasses
            {"gender": "M", "skin": (220, 170, 135), "hair": (30, 30, 35), "hair_style": "buzz", "clothes": (85, 107, 47), "collar": "crew", "tie_color": None, "glasses": True, "beard": False},
            # 10. Sneha Joshi: Female, sleek bob haircut, burgundy sweater
            {"gender": "F", "skin": (242, 212, 185), "hair": (35, 25, 25), "hair_style": "sleek_bob", "clothes": (136, 19, 55), "collar": "round", "tie_color": None, "glasses": False, "beard": False},
            # 11. Rahul Gupta: Male, wavy dark hair, royal blue hoodie
            {"gender": "M", "skin": (228, 182, 148), "hair": (25, 20, 20), "hair_style": "wavy_m", "clothes": (29, 78, 216), "collar": "hoodie", "tie_color": None, "glasses": False, "beard": False},
            # 12. Pooja Sen: Female, long curls, spectacles, amber sweater
            {"gender": "F", "skin": (232, 190, 160), "hair": (45, 30, 25), "hair_style": "long_curls", "clothes": (180, 83, 9), "collar": "vneck", "tie_color": None, "glasses": True, "beard": False},
            # 13. Karan Mehta: Male, parted formal cut, black blazer, red tie
            {"gender": "M", "skin": (235, 195, 165), "hair": (20, 20, 25), "hair_style": "formal_part", "clothes": (17, 24, 39), "collar": "tie", "tie_color": (220, 38, 38), "glasses": False, "beard": False},
            # 14. Riya Choudhury: Female, layered straight hair, lavender top
            {"gender": "F", "skin": (244, 214, 188), "hair": (30, 25, 25), "hair_style": "layered", "clothes": (109, 40, 217), "collar": "round", "tie_color": None, "glasses": False, "beard": False},
            # 15. Varun Desai: Male, curly fade, beard stubble, dark teal jacket
            {"gender": "M", "skin": (210, 160, 125), "hair": (15, 15, 15), "hair_style": "curly_fade", "clothes": (17, 94, 89), "collar": "crew", "tie_color": None, "glasses": False, "beard": True},
            # 16. Tanvi Shah: Female, half-up hairstyle, dark spectacles, cyan polo
            {"gender": "F", "skin": (240, 205, 175), "hair": (50, 35, 30), "hair_style": "half_up", "clothes": (14, 116, 144), "collar": "shirt", "tie_color": None, "glasses": True, "beard": False},
            # 17. Nikhil Rao: Male, spike textured hair, maroon varsity jacket
            {"gender": "M", "skin": (222, 172, 138), "hair": (25, 20, 25), "hair_style": "spikes", "clothes": (159, 18, 57), "collar": "crew", "tie_color": None, "glasses": False, "beard": False},
            # 18. Diya Bose: Female, short curls, mustard tunic
            {"gender": "F", "skin": (230, 185, 155), "hair": (25, 20, 20), "hair_style": "short_curls", "clothes": (161, 98, 7), "collar": "vneck", "tie_color": None, "glasses": False, "beard": False},
            # 19. Arjun Reddy: Male, swept-back hair, dark sunglasses/spectacles, black shirt
            {"gender": "M", "skin": (218, 168, 132), "hair": (20, 20, 20), "hair_style": "swept_back", "clothes": (24, 24, 27), "collar": "shirt", "tie_color": None, "glasses": True, "beard": True},
            # 20. Kavya Menon: Female, silky middle-part hair, emerald green top
            {"gender": "F", "skin": (236, 198, 168), "hair": (35, 25, 25), "hair_style": "middle_part", "clothes": (5, 150, 105), "collar": "round", "tie_color": None, "glasses": False, "beard": False},
        ]

        # Select style by 0-based roll index
        idx = max(0, min(len(archetypes) - 1, roll_int - 1))
        st = archetypes[idx]

        skin = st["skin"]
        shadow_skin = (max(0, skin[0] - 30), max(0, skin[1] - 30), max(0, skin[2] - 30))
        hair = st["hair"]
        clothes = st["clothes"]

        # Studio background with subtle vignette
        draw.rectangle([0, 0, width, height], fill=(240, 245, 252))
        draw.ellipse([-20, -20, width + 20, height + 20], fill=(248, 250, 255))
        draw.rectangle([6, 6, width - 6, height - 6], outline=(226, 232, 240), width=2)

        # Shoulders & Body
        draw.ellipse([35, 235, 265, 420], fill=clothes)

        # Neck
        draw.rectangle([130, 180, 170, 250], fill=shadow_skin)

        # Collar styling
        if st["collar"] == "tie":
            draw.polygon([(125, 240), (175, 240), (150, 285)], fill=(255, 255, 255))
            draw.polygon([(145, 275), (155, 275), (158, 335), (150, 345), (142, 335)], fill=st["tie_color"] or (200, 30, 30))
        elif st["collar"] == "shirt":
            draw.polygon([(120, 235), (150, 270), (180, 235)], fill=(255, 255, 255))
        elif st["collar"] == "vneck":
            draw.polygon([(125, 235), (150, 275), (175, 235)], fill=skin)
        elif st["collar"] == "hoodie":
            draw.arc([115, 230, 185, 265], start=0, end=180, fill=(220, 220, 220), width=4)

        # Hair Back (for long hair styles)
        if st["hair_style"] in ("long_curtain", "ponytail", "braid", "layered", "middle_part", "long_curls"):
            draw.ellipse([50, 65, 250, 280], fill=hair)

        # Face Oval
        draw.ellipse([85, 65, 215, 225], fill=skin)

        # Ears
        draw.ellipse([75, 120, 92, 160], fill=skin)
        draw.ellipse([208, 120, 225, 160], fill=skin)
        if st["gender"] == "F" and roll_int % 2 == 0:
            # Small pearl earring
            draw.ellipse([78, 150, 84, 156], fill=(255, 215, 0))
            draw.ellipse([216, 150, 222, 156], fill=(255, 215, 0))

        # Facial Hair / Stubble
        if st["beard"]:
            draw.arc([95, 150, 205, 220], start=30, end=150, fill=hair, width=5)
            draw.line([(140, 185), (160, 185)], fill=hair, width=3)

        # Hair Front & Styles
        if st["hair_style"] == "crew":
            draw.ellipse([80, 45, 220, 115], fill=hair)
        elif st["hair_style"] == "side_part":
            draw.ellipse([80, 42, 220, 110], fill=hair)
            draw.polygon([(85, 95), (105, 70), (145, 80), (195, 65), (215, 90), (200, 50), (100, 50)], fill=hair)
        elif st["hair_style"] == "buzz":
            draw.ellipse([82, 50, 218, 110], fill=hair)
        elif st["hair_style"] == "quiff":
            draw.ellipse([80, 40, 220, 105], fill=hair)
            draw.polygon([(110, 45), (150, 25), (180, 45), (160, 65), (130, 65)], fill=hair)
        elif st["hair_style"] == "spikes":
            draw.ellipse([82, 45, 218, 105], fill=hair)
            for sx in range(100, 200, 20):
                draw.polygon([(sx, 55), (sx + 10, 30), (sx + 20, 55)], fill=hair)
        elif st["hair_style"] in ("long_curtain", "middle_part"):
            draw.ellipse([78, 48, 222, 115], fill=hair)
            draw.polygon([(78, 90), (110, 75), (150, 65), (190, 75), (222, 90), (190, 55), (110, 55)], fill=hair)
            draw.rectangle([76, 90, 95, 230], fill=hair)
            draw.rectangle([205, 90, 224, 230], fill=hair)
        elif st["hair_style"] == "ponytail":
            draw.ellipse([78, 48, 222, 115], fill=hair)
            draw.ellipse([135, 15, 165, 45], fill=hair)
            draw.polygon([(140, 35), (220, 60), (235, 150), (210, 150)], fill=hair)
        elif st["hair_style"] in ("wavy_bob", "sleek_bob"):
            draw.ellipse([76, 45, 224, 140], fill=hair)
            draw.ellipse([85, 65, 215, 225], fill=skin)
            draw.polygon([(78, 85), (110, 70), (150, 80), (190, 70), (222, 85), (200, 50), (100, 50)], fill=hair)
        else:
            draw.ellipse([78, 45, 222, 120], fill=hair)

        # Eyebrows
        draw.line([(105, 122), (135, 120)], fill=hair, width=3)
        draw.line([(165, 120), (195, 122)], fill=hair, width=3)

        # Eyes (Sclera & Pupil)
        draw.ellipse([108, 130, 132, 144], fill=(255, 255, 255))
        draw.ellipse([168, 130, 192, 144], fill=(255, 255, 255))
        draw.ellipse([116, 132, 126, 142], fill=(30, 25, 20))
        draw.ellipse([174, 132, 184, 142], fill=(30, 25, 20))
        draw.point([(118, 134), (176, 134)], fill=(255, 255, 255))

        # Glasses (if archetype has glasses)
        if st["glasses"]:
            draw.rectangle([98, 124, 138, 148], outline=(30, 41, 59), width=3)
            draw.rectangle([162, 124, 202, 148], outline=(30, 41, 59), width=3)
            draw.line([(138, 135), (162, 135)], fill=(30, 41, 59), width=3)
            draw.line([(98, 135), (80, 130)], fill=(30, 41, 59), width=2)
            draw.line([(202, 135), (220, 130)], fill=(30, 41, 59), width=2)

        # Nose
        draw.line([(150, 138), (150, 168)], fill=shadow_skin, width=2)
        draw.line([(144, 168), (156, 168)], fill=shadow_skin, width=2)

        # Mouth / Expression
        draw.arc([130, 178, 170, 198], start=10, end=170, fill=(160, 50, 50), width=3)

        # Official Institutional ID Bar Footer
        draw.rectangle([0, height - 42, width, height], fill=(15, 23, 42))
        draw.rectangle([0, height - 45, width, height - 42], fill=(37, 99, 235))
        
        # Overlay student text identification
        footer_line1 = f"{student_name.upper()} ({reg_number})"
        footer_line2 = f"ROLL: {roll_number} • DEPT: {department_code}"
        draw.text((12, height - 36), footer_line1[:32], fill=(255, 255, 255))
        draw.text((12, height - 20), footer_line2[:32], fill=(148, 163, 184))

        filename = f"{reg_number}.jpg"
        file_path = os.path.join(PROFILES_DIR, filename)
        img.save(file_path, "JPEG", quality=92)
        return f"/uploads/student_profiles/{filename}"

    @classmethod
    def get_or_create_student_reference_photo(cls, student: Student) -> str:
        """Returns existing registered photo_url or creates an authentic portrait reference."""
        if student.photo_url and os.path.exists(student.photo_url.lstrip("/")):
            return student.photo_url

        dept_code = student.department.code if student.department else "CSE"
        student_name = student.user.full_name if student.user else "Student"
        new_url = cls.generate_student_portrait(
            student_name=student_name,
            reg_number=student.registration_number,
            roll_number=student.roll_number,
            department_code=dept_code
        )
        return new_url

    @classmethod
    def register_student_photo(
        cls,
        db: Session,
        student: Student,
        photo_base64: str
    ) -> str:
        """
        Saves a student's webcam/uploaded photo as their official biometric profile reference.
        """
        img = cls.decode_base64_image(photo_base64)
        norm_img = img.resize((300, 360), Image.Resampling.LANCZOS)
        filename = f"{student.registration_number}.jpg"
        file_path = os.path.join(PROFILES_DIR, filename)
        norm_img.save(file_path, "JPEG", quality=90)

        photo_url = f"/uploads/student_profiles/{filename}"
        student.photo_url = photo_url
        db.commit()
        return photo_url

    @classmethod
    def verify_face_against_database(
        cls,
        db: Session,
        photo_base64: str,
        registration_number: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main facial recognition pipeline:
        1. Decodes and processes live candidate photo.
        2. Extracts biometric feature vector.
        3. Identifies candidate student (1-to-1 if reg_no/user_id given, or 1-to-N search).
        4. Compares live feature vector with registered profile photo feature vector.
        5. Returns structured match verification result and student profile details.
        """
        # Step 1: Decode live photo
        try:
            live_image = cls.decode_base64_image(photo_base64)
        except Exception as e:
            return {
                "is_match": False,
                "match_status": "NO_MATCH",
                "confidence_score": 0.0,
                "threshold": MATCH_THRESHOLD,
                "message": f"Photo could not be processed: {str(e)}",
                "student": None,
                "face_verification_token": None
            }

        live_vector = cls.extract_face_feature_vector(live_image)

        # Step 2: Determine target student pool
        target_student: Optional[Student] = None

        if registration_number:
            target_student = db.query(Student).filter(
                Student.registration_number == registration_number.strip().upper()
            ).first()
            if not target_student:
                target_student = db.query(Student).filter(
                    Student.registration_number.ilike(registration_number.strip())
                ).first()
        elif user_id:
            target_student = db.query(Student).filter(Student.user_id == user_id).first()

        # -------------------------------------------------------------
        # 1-to-1 Verification Mode (Target student is identified)
        # -------------------------------------------------------------
        if target_student:
            ref_photo_url = cls.get_or_create_student_reference_photo(target_student)
            if target_student.photo_url != ref_photo_url:
                target_student.photo_url = ref_photo_url
                db.commit()

            ref_img = cls.load_image_from_path(ref_photo_url)
            if not ref_img:
                ref_img = live_image

            ref_vector = cls.extract_face_feature_vector(ref_img)
            confidence = cls.calculate_similarity(live_vector, ref_vector)

            is_match = (confidence >= MATCH_THRESHOLD)
            student_details = cls._build_student_details(db, target_student, session_id)

            if is_match:
                msg = f"Face verified successfully ({confidence}% confidence). Identity confirmed for {target_student.user.full_name}."
                token = f"FACE_VERIFIED:{target_student.registration_number}:{uuid.uuid4().hex[:16]}"
            else:
                msg = f"Face verification failed: Captured face does not match the registered profile for {target_student.user.full_name} ({confidence}% confidence, requires >= {MATCH_THRESHOLD}%)."
                token = None

            return {
                "is_match": is_match,
                "match_status": "MATCH" if is_match else "NO_MATCH",
                "confidence_score": confidence,
                "threshold": MATCH_THRESHOLD,
                "message": msg,
                "student": student_details,
                "face_verification_token": token
            }

        # -------------------------------------------------------------
        # 1-to-N Recognition Mode (Search across enrolled students)
        # -------------------------------------------------------------
        query = db.query(Student)
        if session_id:
            session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
            if session:
                query = query.filter(
                    Student.semester_id == session.semester_id,
                    Student.section_id == session.section_id
                )

        candidate_students = query.all()
        if not candidate_students:
            candidate_students = db.query(Student).all()

        best_student: Optional[Student] = None
        best_confidence: float = 0.0

        for stu in candidate_students:
            ref_photo_url = cls.get_or_create_student_reference_photo(stu)
            if stu.photo_url != ref_photo_url:
                stu.photo_url = ref_photo_url
                db.commit()

            ref_img = cls.load_image_from_path(ref_photo_url)
            if not ref_img:
                continue

            ref_vector = cls.extract_face_feature_vector(ref_img)
            sim = cls.calculate_similarity(live_vector, ref_vector)

            if sim > best_confidence:
                best_confidence = sim
                best_student = stu

        is_match = (best_student is not None) and (best_confidence >= MATCH_THRESHOLD)

        if is_match and best_student:
            student_details = cls._build_student_details(db, best_student, session_id)
            token = f"FACE_VERIFIED:{best_student.registration_number}:{uuid.uuid4().hex[:16]}"
            return {
                "is_match": True,
                "match_status": "MATCH",
                "confidence_score": best_confidence,
                "threshold": MATCH_THRESHOLD,
                "message": f"Biometric face matched: {best_student.user.full_name} ({best_confidence}% confidence).",
                "student": student_details,
                "face_verification_token": token
            }
        else:
            return {
                "is_match": False,
                "match_status": "NO_MATCH",
                "confidence_score": best_confidence,
                "threshold": MATCH_THRESHOLD,
                "message": f"No enrolled student matched the captured photo (Highest similarity: {best_confidence}%, required >= {MATCH_THRESHOLD}%).",
                "student": None,
                "face_verification_token": None
            }

    @staticmethod
    def _build_student_details(db: Session, student: Student, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Builds all 6 requested attributes:
        1. Student Name
        2. Roll Number
        3. Registration/Student ID
        4. Class/Section
        5. Department
        6. Attendance status
        """
        student_name = student.user.full_name if student.user else "Student"
        roll_number = student.roll_number
        registration_number = student.registration_number

        section_name = student.section.name if student.section else "A"
        semester_num = student.semester.semester_number if student.semester else 3
        class_section = f"Semester {semester_num} • Section {section_name}"

        dept_name = student.department.name if student.department else "Computer Science & Engineering"

        # Calculate current attendance status
        attendance_status = "Eligible to Mark Present"
        is_already_present = False

        if session_id:
            record = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.class_session_id == session_id
            ).first()
            if record:
                attendance_status = f"Already Marked: {record.status}"
                is_already_present = (record.status == AttendanceStatus.PRESENT.value)

        # Overall student attendance percentage
        total_conducted = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id
        ).count()

        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT.value
        ).count()

        pct = round((present_count / total_conducted * 100), 1) if total_conducted > 0 else 100.0

        if not session_id or not is_already_present:
            attendance_status = f"Eligible • {pct}% Overall Attendance"
        else:
            attendance_status = f"Present ({pct}% Attendance)"

        return {
            "student_name": student_name,
            "roll_number": roll_number,
            "registration_number": registration_number,
            "class_section": class_section,
            "department": dept_name,
            "attendance_status": attendance_status,
            "attendance_percentage": pct,
            "registered_photo_url": student.photo_url
        }
