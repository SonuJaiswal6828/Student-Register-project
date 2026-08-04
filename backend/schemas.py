from pydantic import BaseModel
from typing import List

class StudentItem(BaseModel):
    UniversityCode: int
    CollegeName: str
    ProgrammeCode: str
    ProgrammeName: str
    EnrolmentNumber: str
    StudentName: str
    EnrolmentYear: int

class Wrapper(BaseModel):
    students: List[StudentItem]