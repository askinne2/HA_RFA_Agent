export interface Resource {
    basic_info: {
        id: string;
        title_en: string;
        title_es: string;
        category: string;
        subcategories: string[];
        description_en: string;
        description_es: string;
        languages: string[];
        website: string;
        contact_phone: string;
        contact_email: string | null;
        address: string;
        coordinates: {
            latitude: number;
            longitude: number;
        };
    };
    eligibility: {
        income_requirements: {
            min_income: number | null;
            max_income: number | null;
            income_brackets: string[];
        };
        age_requirements: {
            min_age: number | null;
            max_age: number | null;
            age_ranges: string[];
        };
        documentation_required: string[];
        service_area: {
            zipcodes: string[];
            counties: string[];
            regions: string[];
        };
    };
    service_details: {
        hours: {
            [key: string]: string;
        };
        appointment_required: boolean | null;
        walk_in_accepted: boolean | null;
        estimated_wait_time: string;
        service_duration: string;
        cost: string;
    };
    interaction_patterns: {
        common_request_types: string[];
        average_interaction_duration: number | null;
        successful_referral_rate: number | null;
        follow_up_required: boolean | null;
        notes: string;
    };
    metadata: {
        last_verified: string;
        verification_source: string;
        update_frequency: string;
        trust_score: number;
    };
}

export interface UserRequest {
    language: string;
    zipcode?: string;
    income?: string;
    age?: string;
    category?: string;
    subcategory?: string;
    latitude?: number;
    longitude?: number;
}

export interface MatchingRationale {
    total_score: number;
    factors: {
        [key: string]: {
            score: number;
            weight: number;
            explanation: string;
        };
    };
    summary: string;
}

export interface MatchedResource {
    score: number;
    rationale: MatchingRationale;
    resource: {
        title: string;
        category: string;
        subcategories: string[];
        languages: string[];
        description: string;
        contact: {
            phone: string;
            email: string | null;
            website: string;
        };
        address: string;
        service_details: Resource['service_details'];
    };
}

export class ResourceMatcher {
    private guide: {
        version: string;
        last_updated: string;
        resources: Resource[];
        categories: {
            primary: string[];
            subcategories: {
                [key: string]: string[];
            };
        };
        matching_criteria: {
            priority_factors: string[];
            scoring_weights: {
                [key: string]: number;
            };
        };
    };

    constructor(resourceGuide: any) {
        this.guide = resourceGuide;
    }

    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    private toRad(degrees: number): number {
        return degrees * (Math.PI/180);
    }

    private calculateLanguageScore(resource: Resource, userLanguage: string): number {
        if (!userLanguage) return 1.0;
        return resource.basic_info.languages.includes(userLanguage) ? 1.0 : 0.0;
    }

    private calculateProximityScore(resource: Resource, request: UserRequest): number {
        if (!request.latitude || !request.longitude) {
            if (!request.zipcode) return 1.0;
            return resource.eligibility.service_area.zipcodes.includes(request.zipcode) ? 1.0 : 0.0;
        }

        const resourceCoords = resource.basic_info.coordinates;
        if (!resourceCoords.latitude || !resourceCoords.longitude) return 0.0;

        const distance = this.haversineDistance(
            request.latitude,
            request.longitude,
            resourceCoords.latitude,
            resourceCoords.longitude
        );

        const maxDistance = 50; // km
        return Math.max(0, 1 - (distance / maxDistance));
    }

    private calculateIncomeScore(resource: Resource, userIncome?: string): number {
        if (!userIncome) return 1.0;
        const resourceBrackets = resource.eligibility.income_requirements.income_brackets;
        if (!resourceBrackets.length) return 1.0;
        return resourceBrackets.includes(userIncome) ? 1.0 : 0.0;
    }

    private calculateAvailabilityScore(resource: Resource): number {
        if (resource.service_details.appointment_required === null) return 0.5;
        return resource.service_details.walk_in_accepted ? 1.0 : 0.7;
    }

    private calculateCategoryScore(resource: Resource, category?: string, subcategory?: string): number {
        if (!category) return 1.0;
        if (!resource.basic_info.category || 
            category.toLowerCase() !== resource.basic_info.category.toLowerCase()) {
            return 0.0;
        }
        if (subcategory) {
            return resource.basic_info.subcategories.includes(subcategory) ? 1.0 : 0.5;
        }
        return 1.0;
    }

    private explainMatchingRationale(resource: Resource, request: UserRequest): MatchingRationale {
        const scores = {
            language_match: this.calculateLanguageScore(resource, request.language),
            geographic_proximity: this.calculateProximityScore(resource, request),
            income_eligibility: this.calculateIncomeScore(resource, request.income),
            service_availability: this.calculateAvailabilityScore(resource),
            specialized_services: this.calculateCategoryScore(resource, request.category, request.subcategory)
        };

        const explanations = {
            language_match: {
                score: scores.language_match,
                weight: this.guide.matching_criteria.scoring_weights.language_match,
                explanation: this.explainLanguageMatch(resource, request.language)
            },
            geographic_proximity: {
                score: scores.geographic_proximity,
                weight: this.guide.matching_criteria.scoring_weights.geographic_proximity,
                explanation: this.explainProximityMatch(resource, request)
            },
            income_eligibility: {
                score: scores.income_eligibility,
                weight: this.guide.matching_criteria.scoring_weights.income_eligibility,
                explanation: this.explainIncomeMatch(resource, request.income)
            },
            service_availability: {
                score: scores.service_availability,
                weight: this.guide.matching_criteria.scoring_weights.service_availability,
                explanation: this.explainAvailabilityMatch(resource)
            },
            specialized_services: {
                score: scores.specialized_services,
                weight: this.guide.matching_criteria.scoring_weights.specialized_services,
                explanation: this.explainCategoryMatch(resource, request.category, request.subcategory)
            }
        };

        const total_score = Object.entries(scores).reduce(
            (sum, [factor, score]) => sum + score * this.guide.matching_criteria.scoring_weights[factor],
            0
        );

        return {
            total_score,
            factors: explanations,
            summary: this.generateSummary(explanations)
        };
    }

    private explainLanguageMatch(resource: Resource, userLanguage: string): string {
        if (!userLanguage) return "No language preference specified - all resources considered";
        return resource.basic_info.languages.includes(userLanguage)
            ? `Perfect match - resource supports ${userLanguage}`
            : `No match - resource does not support ${userLanguage}`;
    }

    private explainProximityMatch(resource: Resource, request: UserRequest): string {
        if (!request.latitude || !request.longitude) {
            if (!request.zipcode) return "No location specified - all resources considered";
            return resource.eligibility.service_area.zipcodes.includes(request.zipcode)
                ? `Perfect match - resource serves zipcode ${request.zipcode}`
                : `No match - resource does not serve zipcode ${request.zipcode}`;
        }

        const resourceCoords = resource.basic_info.coordinates;
        if (!resourceCoords.latitude || !resourceCoords.longitude) {
            return "No location data available for resource";
        }

        const distance = this.haversineDistance(
            request.latitude,
            request.longitude,
            resourceCoords.latitude,
            resourceCoords.longitude
        );

        return `Resource is ${distance.toFixed(1)} km away from your location`;
    }

    private explainIncomeMatch(resource: Resource, userIncome?: string): string {
        if (!userIncome) return "No income information provided - all resources considered";
        const resourceBrackets = resource.eligibility.income_requirements.income_brackets;
        if (!resourceBrackets.length) return "No income requirements specified for this resource";
        return resourceBrackets.includes(userIncome)
            ? `Perfect match - resource serves your income bracket (${userIncome})`
            : `No match - resource does not serve your income bracket (${userIncome})`;
    }

    private explainAvailabilityMatch(resource: Resource): string {
        if (resource.service_details.appointment_required === null) {
            return "Availability information not specified";
        }
        return resource.service_details.walk_in_accepted
            ? "High availability - walk-in services accepted"
            : "Moderate availability - appointments required";
    }

    private explainCategoryMatch(resource: Resource, category?: string, subcategory?: string): string {
        if (!category) return "No category specified - all resources considered";
        if (!resource.basic_info.category || 
            category.toLowerCase() !== resource.basic_info.category.toLowerCase()) {
            return `No match - resource category (${resource.basic_info.category}) does not match requested category (${category})`;
        }
        if (subcategory) {
            return resource.basic_info.subcategories.includes(subcategory)
                ? `Perfect match - resource offers requested subcategory (${subcategory})`
                : "Partial match - resource matches category but not subcategory";
        }
        return `Perfect match - resource matches requested category (${category})`;
    }

    private generateSummary(explanations: MatchingRationale['factors']): string {
        const summaryParts: string[] = [];
        
        // Add strongest matches first
        Object.entries(explanations).forEach(([_, details]) => {
            if (details.score >= 0.8) {
                summaryParts.push(details.explanation);
            }
        });
        
        // Add moderate matches
        Object.entries(explanations).forEach(([_, details]) => {
            if (0.5 <= details.score && details.score < 0.8) {
                summaryParts.push(details.explanation);
            }
        });
        
        // Add weak matches
        Object.entries(explanations).forEach(([_, details]) => {
            if (details.score < 0.5) {
                summaryParts.push(details.explanation);
            }
        });
        
        return summaryParts.join(" | ");
    }

    public findMatchingResources(
        request: UserRequest,
        minScore: number = 0.5,
        maxResults: number = 10
    ): MatchedResource[] {
        const scoredResources: [number, Resource, MatchingRationale][] = [];
        
        for (const resource of this.guide.resources) {
            const score = this.scoreResource(resource, request);
            if (score >= minScore) {
                const rationale = this.explainMatchingRationale(resource, request);
                scoredResources.push([score, resource, rationale]);
            }
        }
        
        scoredResources.sort((a, b) => b[0] - a[0]);
        
        return scoredResources.slice(0, maxResults).map(([score, resource, rationale]) => ({
            score,
            rationale,
            resource: {
                title: resource.basic_info.title_en,
                category: resource.basic_info.category,
                subcategories: resource.basic_info.subcategories,
                languages: resource.basic_info.languages,
                description: resource.basic_info.description_en,
                contact: {
                    phone: resource.basic_info.contact_phone,
                    email: resource.basic_info.contact_email,
                    website: resource.basic_info.website
                },
                address: resource.basic_info.address,
                service_details: resource.service_details
            }
        }));
    }

    private scoreResource(resource: Resource, request: UserRequest): number {
        const scores = {
            language_match: this.calculateLanguageScore(resource, request.language),
            geographic_proximity: this.calculateProximityScore(resource, request),
            income_eligibility: this.calculateIncomeScore(resource, request.income),
            service_availability: this.calculateAvailabilityScore(resource),
            specialized_services: this.calculateCategoryScore(resource, request.category, request.subcategory)
        };
        
        return Object.entries(scores).reduce(
            (sum, [factor, score]) => sum + score * this.guide.matching_criteria.scoring_weights[factor],
            0
        );
    }
} 