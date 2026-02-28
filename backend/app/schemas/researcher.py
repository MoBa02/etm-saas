from pydantic import BaseModel
from typing import List, Optional

class Competitor(BaseModel):
    name: str
    url: Optional[str] = None
    summary: Optional[str] = None

class ResearcherOutput(BaseModel):
    competitors: List[Competitor]
    local_pain_points: List[str]
    cultural_hooks: List[str]
