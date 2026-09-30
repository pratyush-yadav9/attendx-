import os

# Using square brackets here so your chat app doesn't turn it into a web page!
safe_text = """[!DOCTYPE html]
[html lang="en"]
[head]
    [meta charset="UTF-8"]
    [meta name="viewport" content="width=device-width, initial-scale=1.0"]
    [title]AttendX Dashboard[/title]
    [script src="https://cdn.tailwindcss.com"][/script]
[/head]
[body class="bg-gray-100 min-h-screen p-6 text-gray-800"]
    [div class="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-md space-y-6"]
        [h1 class="text-2xl font-bold text-indigo-600 border-b pb-2"]AttendX System[/h1]
        
        [!-- Auth Form --]
        [div class="space-y-3"]
            [h2 class="font-semibold text-gray-700"]Account Login / Register[/h2]
            [div class="grid grid-cols-1 md:grid-cols-2 gap-3"]
                [input id="email" type="email" placeholder="Email" class="border p-2 rounded text-sm w-full"]
                [input id="pass" type="password" placeholder="Password" class="border p-2 rounded text-sm w-full"]
            [/div]
            [div class="flex gap-2"]
                [button onclick="login()" class="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-indigo-700"]Login[/button]
                [button onclick="register('STUDENT')" class="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-300"]Register Student[/button]
                [button onclick="register('TEACHER')" class="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-300"]Register Teacher[/button]
            [/div]
        [/div]

        [!-- Dashboard --]
        [div id="dashboard" class="hidden border-t pt-4 space-y-4"]
            [!-- Teacher Section --]
            [div class="bg-indigo-50 p-4 rounded-lg space-y-2 border border-indigo-200"]
                [h3 class="font-bold text-indigo-900 text-sm"]Teacher: Launch Geofenced Session[/h3]
                [div class="grid grid-cols-2 gap-2"]
                    [input id="subjectInput" type="text" placeholder="Subject ID (e.g. CS101)" class="border p-1.5 rounded text-xs w-full"]
                    [input id="classroomInput" type="text" placeholder="Classroom ID (e.g. ROOM1)" class="border p-1.5 rounded text-xs w-full"]
                [/div]
                [button onclick="createSession()" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-indigo-700"]Get Location & Start Session[/button]
                [div id="sessionOut" class="text-xs font-mono break-all mt-2 p-2 bg-white rounded border hidden"][/div]
            [/div]

            [!-- Student Section --]
            [div class="bg-green-50 p-4 rounded-lg space-y-2 border border-green-200"]
                [h3 class="font-bold text-green-900 text-sm"]Student: Submit Attendance[/h3]
                [input id="tokenInput" type="text" placeholder="Paste Session Token Here" class="w-full border p-2 rounded text-xs font-mono"]
                [button onclick="markAttendance()" class="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-green-700"]Verify Location & Submit[/button]
                [div id="markOut" class="text-xs font-semibold mt-2 p-2 bg-white rounded border hidden break-all"][/div]
            [/div]
        [/div]
    [/div]

    [script]
        let token = localStorage.getItem("attendx_token");
        if (token) document.getElementById("dashboard").classList.remove("hidden");

        async function register(role) {
            const email = document.getElementById("email").value;
            const password = document.getElementById("pass").value;
            if (!email || !password) return alert("Enter email and password");

            try {
                const res = await fetch("/api/v1/auth/register", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({ email, password, first_name: "Demo", last_name: "User", role })
                });
                const data = await res.json();
                alert(res.ok ? `Registered as ${role}! You can now login.` : "Error: " + JSON.stringify(data.detail || data));
            } catch (e) { alert("Network Error: " + e.message); }
        }

        async function login() {
            const email = document.getElementById("email").value;
            const password = document.getElementById("pass").value;
            if (!email || !password) return alert("Enter email and password");

            const body = new URLSearchParams({ username: email, password: password });
            try {
                const res = await fetch("/api/v1/auth/login", {
                    method: "POST",
                    headers: {"Content-Type": "application/x-www-form-urlencoded"},
                    body
                });
                const data = await res.json();
                if (res.ok) {
                    token = data.access_token;
                    localStorage.setItem("attendx_token", token);
                    document.getElementById("dashboard").classList.remove("hidden");
                    alert("Logged in successfully!");
                } else {
                    alert("Login failed: " + (data.detail || JSON.stringify(data)));
                }
            } catch (e) { alert("Network Error: " + e.message); }
        }

        function createSession() {
            if (!token) return alert("Please login first");
            if (!navigator.geolocation) return alert("Geolocation not supported");

            const subject_id = document.getElementById("subjectInput").value || "CS101";
            const classroom_id = document.getElementById("classroomInput").value || "ROOM1";

            navigator.geolocation.getCurrentPosition(async (pos) => {
                const res = await fetch("/api/v1/attendance/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({
                        subject_id, classroom_id,
                        geo_lat: pos.coords.latitude, geo_lng: pos.coords.longitude,
                        allowed_radius_meters: 50.0, duration_minutes: 60
                    })
                });
                const data = await res.json();
                const out = document.getElementById("sessionOut");
                out.classList.remove("hidden");
                out.innerText = res.ok ? `Session Token: \({data.session_token || JSON.stringify(data)}` : `Error:\){JSON.stringify(data)}`;
                if (data.session_token) document.getElementById("tokenInput").value = data.session_token;
            }, (err) => alert("GPS Error: " + err.message));
        }

        function markAttendance() {
            if (!token) return alert("Please login first");
            const sessionToken = document.getElementById("tokenInput").value;
            if (!sessionToken) return alert("Enter session token");
            if (!navigator.geolocation) return alert("Geolocation not supported");

            navigator.geolocation.getCurrentPosition(async (pos) => {
                const res = await fetch("/api/v1/attendance/mark", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({
                        session_token: sessionToken,
                        student_lat: pos.coords.latitude,
                        student_lng: pos.coords.longitude,
                        device_fingerprint: "web-browser"
                    })
                });
                const data = await res.json();
                const out = document.getElementById("markOut");
                out.classList.remove("hidden");
                out.innerText = res.ok ? `Success: \({JSON.stringify(data)}` : `Failed:\){JSON.stringify(data)}`;
            }, (err) => alert("GPS Error: " + err.message));
        }
    [/script]
[/body]
[/html]
"""

# This automatically changes the square brackets back into real HTML brackets
real_html_code = safe_text.replace("[", "<").replace("]", ">")

os.makedirs("static", exist_ok=True)
with open("static/index.html", "w", encoding="utf-8") as f:
    f.write(real_html_code)

print("SUCCESS: static/index.html updated successfully!")