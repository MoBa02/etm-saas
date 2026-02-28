"""
app/schemas/clarifier.py
────────────────────────
Strict output schema for the Clarifier pipeline step.

The Clarifier receives raw business input and outputs:
  1. A normalized business profile
  2. Extracted niche + region for Tavily competitor search
  3. Tone/dialect recommendations based on locale
"""

from pydantic import BaseModel, Field
from typing import Optional


class ClarifierOutput(BaseModel):
    """
    Validated output of the Clarifier LLM step.
    This is saved to job_steps.output_data and passed to the Researcher.
    """

    # Normalized business identity
    business_name:      str = Field(..., description="Cleaned business name")
    business_type:      str = Field(..., description="Normalized business category")
    target_city:        str = Field(..., description="Primary target city")
    target_country:     str = Field(..., description="Inferred country from locale")

    # Search terms for Tavily (extracted by LLM for precision)
    search_niche:       str = Field(
        ...,
        description="Concise English search term for the business niche. E.g. 'dental clinic'"
    )
    search_region:      str = Field(
        ...,
        description="Concise English/Arabic region term. E.g. 'Dammam Saudi Arabia'"
    )

    # Localization recommendations
    locale:             str = Field(..., description="BCP-47 locale tag e.g. ar-SA")
    direction:          str = Field(..., description="rtl or ltr")
    dialect:            str = Field(
        ...,
        description="Recommended dialect. E.g. 'Gulf Arabic', 'Modern Standard Arabic', 'English'"
    )
    tone:               str = Field(
        ...,
        description="Recommended tone. E.g. 'professional', 'friendly', 'urgent'"
    )

    # Optional clarifications
    usp:                Optional[str] = Field(
        None,
        description="Inferred unique selling proposition if obvious from input"
    )
    additional_notes:   Optional[str] = None
