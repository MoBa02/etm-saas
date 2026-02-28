from pydantic import BaseModel
from typing import List, Optional

class HeroSection(BaseModel):
    headline: str
    subheadline: str
    cta_text: str

class FeatureItem(BaseModel):
    title: str
    description: str

class BenefitItem(BaseModel):
    title: str
    description: str

class LandingPageContent(BaseModel):
    hero: HeroSection
    features: List[FeatureItem]
    benefits: List[BenefitItem]
    cta_headline: str
    cta_subtext: str
    cta_button_text: str
    social_proof: Optional[str] = None
