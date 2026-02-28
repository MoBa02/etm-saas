from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal, Optional

class ThemeConfig(BaseModel):
    primary_color: str = "#C8A96E"
    font_family: str = "Cairo"
    border_radius: str = "12px"

class ComponentBlock(BaseModel):
    id: str
    type: Literal["hero", "features", "benefits", "whatsapp_cta", "footer"]
    data: Dict[str, Any]

class LandingPageStructure(BaseModel):
    brand_name: str = "Etm"
    theme: ThemeConfig = Field(default_factory=ThemeConfig)
    rtl: bool = False
    locale: str = "ar-SA"
    layout: List[ComponentBlock]
