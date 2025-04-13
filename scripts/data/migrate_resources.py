import json
import re
from datetime import datetime
from typing import Dict, List, Any
import uuid

def extract_coordinates(location_str: str) -> Dict[str, float]:
    """Extract latitude and longitude from location string."""
    if not location_str:
        return {"latitude": None, "longitude": None}
    
    # Try to find coordinates in the string
    coords = re.findall(r'(-?\d+\.\d+)', location_str)
    if len(coords) >= 2:
        return {
            "latitude": float(coords[0]),
            "longitude": float(coords[1])
        }
    return {"latitude": None, "longitude": None}

def extract_zipcode(address: str) -> str:
    """Extract zipcode from address string."""
    if not address:
        return None
    zip_match = re.search(r'\b\d{5}\b', address)
    return zip_match.group(0) if zip_match else None

def determine_subcategories(category: str, title: str, description: str) -> List[str]:
    """Determine subcategories based on category and content."""
    subcategories = []
    
    # Handle None values
    category = category or ""
    title = title or ""
    description = description or ""
    
    # Legal subcategories
    if category.lower() == "legal":
        if any(term in (title + " " + description).lower() 
               for term in ["immigration", "immigrant", "citizenship"]):
            subcategories.append("Immigration")
        if any(term in (title + " " + description).lower() 
               for term in ["family law", "divorce", "custody"]):
            subcategories.append("Family Law")
        if any(term in (title + " " + description).lower() 
               for term in ["harassment", "discrimination", "workplace"]):
            subcategories.append("Work Harassment/Discrimination")
    
    # Financial subcategories
    elif category.lower() == "financial":
        if any(term in (title + " " + description).lower() 
               for term in ["vita", "tax", "irs"]):
            subcategories.append("VITA Tax Assistance")
        if any(term in (title + " " + description).lower() 
               for term in ["credit", "debt", "financial education"]):
            subcategories.append("Credit Counseling")
    
    # Health subcategories
    elif category.lower() == "health":
        if any(term in (title + " " + description).lower() 
               for term in ["primary care", "doctor", "clinic"]):
            subcategories.append("Primary Care")
        if any(term in (title + " " + description).lower() 
               for term in ["mental", "counseling", "therapy"]):
            subcategories.append("Mental Health")
        if any(term in (title + " " + description).lower() 
               for term in ["dental", "teeth", "dentist"]):
            subcategories.append("Dental")
        if any(term in (title + " " + description).lower() 
               for term in ["vision", "eye", "optometrist"]):
            subcategories.append("Vision")
    
    return subcategories

def migrate_resource(old_resource: Dict[str, Any]) -> Dict[str, Any]:
    """Migrate a single resource to the new format."""
    coordinates = extract_coordinates(old_resource.get("Latitude, Longitude", ""))
    zipcode = extract_zipcode(old_resource.get("address", ""))
    
    return {
        "basic_info": {
            "id": str(uuid.uuid4()),
            "title_en": old_resource.get("title_en", ""),
            "title_es": "",  # Will need to be filled in later
            "category": old_resource.get("category", ""),
            "subcategories": determine_subcategories(
                old_resource.get("category", ""),
                old_resource.get("title_en", ""),
                old_resource.get("post_content", "")
            ),
            "description_en": old_resource.get("post_content", ""),
            "description_es": "",  # Will need to be filled in later
            "languages": old_resource.get("languages", "").split(", "),
            "website": old_resource.get("website", ""),
            "contact_phone": old_resource.get("contact_phone", ""),
            "contact_email": old_resource.get("contact_email", ""),
            "address": old_resource.get("address", ""),
            "coordinates": coordinates
        },
        "eligibility": {
            "income_requirements": {
                "min_income": None,
                "max_income": None,
                "income_brackets": []  # Will need to be filled in later
            },
            "age_requirements": {
                "min_age": None,
                "max_age": None,
                "age_ranges": []  # Will need to be filled in later
            },
            "documentation_required": [],  # Will need to be filled in later
            "service_area": {
                "zipcodes": [zipcode] if zipcode else [],
                "counties": [],  # Will need to be filled in later
                "regions": [old_resource.get("region", "")]
            }
        },
        "service_details": {
            "hours": {
                "monday": "Unknown",
                "tuesday": "Unknown",
                "wednesday": "Unknown",
                "thursday": "Unknown",
                "friday": "Unknown",
                "saturday": "Unknown",
                "sunday": "Unknown"
            },
            "appointment_required": None,  # Will need to be filled in later
            "walk_in_accepted": None,  # Will need to be filled in later
            "estimated_wait_time": "Unknown",
            "service_duration": "Unknown",
            "cost": "Unknown"
        },
        "interaction_patterns": {
            "common_request_types": [old_resource.get("category", "")],
            "average_interaction_duration": None,  # Will need to be filled in later
            "successful_referral_rate": None,  # Will need to be filled in later
            "follow_up_required": None,  # Will need to be filled in later
            "notes": ""
        },
        "metadata": {
            "last_verified": datetime.now().strftime("%Y-%m-%d"),
            "verification_source": "Original Resource Guide",
            "update_frequency": "Unknown",
            "trust_score": 0.8  # Default trust score
        }
    }

def main():
    # Load the original resource guide
    with open('docs/ha_resource_guide.json', 'r') as f:
        original_resources = json.load(f)
    
    # Migrate each resource
    migrated_resources = [migrate_resource(resource) for resource in original_resources]
    
    # Create the enhanced structure
    enhanced_guide = {
        "version": "1.0",
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "resources": migrated_resources,
        "categories": {
            "primary": list(set(resource["basic_info"]["category"] for resource in migrated_resources)),
            "subcategories": {
                "Legal": ["Immigration", "Family Law", "Work Harassment/Discrimination", "Housing Rights"],
                "Financial": ["VITA Tax Assistance", "Credit Counseling", "Financial Education"],
                "Health": ["Primary Care", "Mental Health", "Dental", "Vision"]
            }
        },
        "matching_criteria": {
            "priority_factors": [
                "language_match",
                "geographic_proximity",
                "income_eligibility",
                "service_availability",
                "specialized_services"
            ],
            "scoring_weights": {
                "language_match": 0.3,
                "geographic_proximity": 0.2,
                "income_eligibility": 0.2,
                "service_availability": 0.15,
                "specialized_services": 0.15
            }
        }
    }
    
    # Save the enhanced guide
    with open('docs/enhanced_resource_guide.json', 'w') as f:
        json.dump(enhanced_guide, f, indent=2)

if __name__ == "__main__":
    main() 