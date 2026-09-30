from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models.user import User, Admin, Teacher
from app.models.academic import TimetableSlot, Subject, Classroom, Section, Semester
from app.schemas.academic import TimetableSlotCreate
from app.dependencies import require_hod_admin, get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/v1/timetable", tags=["Timetable Management"])


@router.get("")
def list_timetable_slots(
    semester_id: Optional[str] = Query(None),
    section_id: Optional[str] = Query(None),
    day_of_week: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List timetable slots with optional semester, section, and day filtering.
    """
    query = db.query(TimetableSlot)
    if semester_id:
        query = query.filter(TimetableSlot.semester_id == semester_id)
    if section_id:
        query = query.filter(TimetableSlot.section_id == section_id)
    if day_of_week:
        query = query.filter(TimetableSlot.day_of_week == day_of_week)

    slots = query.order_by(TimetableSlot.start_time).all()

    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "day_of_week": s.day_of_week,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "slot_period": s.slot_period,
                "subject_id": s.subject_id,
                "subject_name": s.subject.name if s.subject else "",
                "subject_code": s.subject.code if s.subject else "",
                "teacher_id": s.teacher_id,
                "teacher_name": s.teacher.user.full_name if s.teacher and s.teacher.user else "",
                "classroom_id": s.classroom_id,
                "room_number": s.classroom.room_number if s.classroom else "",
                "section_id": s.section_id,
                "section_name": s.section.name if s.section else "",
                "semester_id": s.semester_id,
                "semester_number": s.semester.semester_number if s.semester else 1
            }
            for s in slots
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_timetable_slot(
    data: TimetableSlotCreate,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data

    # Check clash: teacher already booked at this time and day
    clash_teacher = db.query(TimetableSlot).filter(
        TimetableSlot.teacher_id == data.teacher_id,
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.start_time == data.start_time
    ).first()
    if clash_teacher:
        raise HTTPException(
            status_code=400,
            detail=f"Scheduling clash: Teacher is already scheduled for {clash_teacher.subject.name} at {data.start_time}."
        )

    # Check classroom clash
    clash_room = db.query(TimetableSlot).filter(
        TimetableSlot.classroom_id == data.classroom_id,
        TimetableSlot.day_of_week == data.day_of_week,
        TimetableSlot.start_time == data.start_time
    ).first()
    if clash_room:
        raise HTTPException(
            status_code=400,
            detail=f"Classroom clash: Room is already booked for another session at {data.start_time}."
        )

    slot = TimetableSlot(
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        slot_period=data.slot_period,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        classroom_id=data.classroom_id,
        section_id=data.section_id,
        semester_id=data.semester_id
    )
    db.add(slot)
    db.commit()

    AuditService.log(
        db=db,
        action="TIMETABLE_SLOT_CREATED",
        target_type="TIMETABLE",
        user=user,
        target_id=slot.id,
        details={"day": data.day_of_week, "time": data.start_time, "subject_id": data.subject_id}
    )

    return {"success": True, "message": "Timetable slot created.", "data": {"id": slot.id}}


@router.delete("/{slot_id}")
def delete_timetable_slot(
    slot_id: str,
    auth_data: tuple[User, Admin] = Depends(require_hod_admin),
    db: Session = Depends(get_db)
):
    user, admin = auth_data
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    db.delete(slot)
    db.commit()

    return {"success": True, "message": "Timetable slot deleted."}
