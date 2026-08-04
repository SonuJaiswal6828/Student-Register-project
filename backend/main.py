from fastapi import FastAPI, UploadFile, File, HTTPException
import csv
import io
from schemas import Wrapper
from db import get_connection, get_cursor

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://student-register-project.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-csv")
async def upload_csv(file : UploadFile = File(...)):

    contents = await file.read()
    text_data = contents.decode('utf-8')

    row_data =io.StringIO(text_data)

    render = csv.DictReader(row_data)

    data = list(render)

    return data

@app.post("/save-students")
def save_students(payload: Wrapper):
    conn = get_connection()
    cur = get_cursor(conn)
    inserted_count = 0
    total_count = 0
    for student in payload.students:
        cur.execute("INSERT INTO students (university_code, college_name, programme_code, programme_name, enrolment_number, student_name, enrolment_year) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (enrolment_number) DO NOTHING;", (student.UniversityCode, student.CollegeName, student.ProgrammeCode, student.ProgrammeName, student.EnrolmentNumber, student.StudentName, student.EnrolmentYear))
        total_count +=1
        count = cur.rowcount
        if count == 1:
            inserted_count +=1


    skipped_count = total_count - inserted_count

    conn.commit()
    conn.close()

    return  {"inserted": inserted_count, "skipped": skipped_count}


@app.get("/students")
def get_students():
    conn = get_connection()
    cur = get_cursor(conn)
    
    cur.execute("SELECT * FROM students;")
    results = cur.fetchall()
    
    conn.close()
    return results
