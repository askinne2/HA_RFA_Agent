import { describe, expect, it, beforeEach } from '@jest/globals';
import { ResourceMatcher, UserRequest } from './resourceMatcher';

// Mock resource guide data
const mockResourceGuide = {
    version: "1.0",
    last_updated: "2024-04-12",
    resources: [
        {
            basic_info: {
                id: "1",
                title_en: "Legal Aid Center",
                title_es: "Centro de Asistencia Legal",
                category: "Legal",
                subcategories: ["Immigration", "Housing"],
                description_en: "Provides legal assistance for immigration and housing issues",
                description_es: "Proporciona asistencia legal para asuntos de inmigración y vivienda",
                languages: ["en", "es"],
                website: "https://legalaid.example.com",
                contact_phone: "123-456-7890",
                contact_email: "info@legalaid.example.com",
                address: "123 Main St, Greenville, SC 29605",
                coordinates: {
                    latitude: 34.8526,
                    longitude: -82.3940
                }
            },
            eligibility: {
                income_requirements: {
                    min_income: null,
                    max_income: null,
                    income_brackets: ["low", "medium"]
                },
                age_requirements: {
                    min_age: 18,
                    max_age: null,
                    age_ranges: ["adult"]
                },
                documentation_required: ["ID", "Proof of Income"],
                service_area: {
                    zipcodes: ["29605", "29601"],
                    counties: ["Greenville"],
                    regions: ["Upstate"]
                }
            },
            service_details: {
                hours: {
                    "Monday": "9:00-17:00",
                    "Tuesday": "9:00-17:00"
                },
                appointment_required: true,
                walk_in_accepted: false,
                estimated_wait_time: "2 weeks",
                service_duration: "1 hour",
                cost: "Free"
            },
            interaction_patterns: {
                common_request_types: ["immigration", "housing"],
                average_interaction_duration: 60,
                successful_referral_rate: 0.85,
                follow_up_required: true,
                notes: "Bilingual staff available"
            },
            metadata: {
                last_verified: "2024-04-01",
                verification_source: "Staff",
                update_frequency: "Monthly",
                trust_score: 0.9
            }
        }
    ],
    categories: {
        primary: ["Legal", "Housing", "Education"],
        subcategories: {
            "Legal": ["Immigration", "Housing", "Employment"],
            "Housing": ["Rental", "Homeownership", "Homelessness"],
            "Education": ["ESL", "GED", "Vocational"]
        }
    },
    matching_criteria: {
        priority_factors: ["language_match", "geographic_proximity", "income_eligibility"],
        scoring_weights: {
            language_match: 0.3,
            geographic_proximity: 0.2,
            income_eligibility: 0.2,
            service_availability: 0.15,
            specialized_services: 0.15
        }
    }
};

describe('ResourceMatcher', () => {
    let matcher: ResourceMatcher;

    beforeEach(() => {
        matcher = new ResourceMatcher(mockResourceGuide);
    });

    describe('Language Matching', () => {
        it('should give perfect score for matching language', () => {
            const request = { language: 'es' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].score).toBeGreaterThan(0.8);
            expect(matches[0].rationale.factors.language_match.score).toBe(1);
        });

        it('should give zero score for non-matching language', () => {
            const request = { language: 'fr' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.language_match.score).toBe(0);
        });
    });

    describe('Geographic Proximity', () => {
        it('should give perfect score for matching zipcode', () => {
            const request = { language: 'en', zipcode: '29605' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.geographic_proximity.score).toBe(1);
        });

        it('should calculate distance-based score for coordinates', () => {
            const request = {
                language: 'en',
                latitude: 34.8526,
                longitude: -82.3940
            };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.geographic_proximity.score).toBe(1);
        });
    });

    describe('Income Eligibility', () => {
        it('should give perfect score for matching income bracket', () => {
            const request = { language: 'en', income: 'low' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.income_eligibility.score).toBe(1);
        });

        it('should give zero score for non-matching income bracket', () => {
            const request = { language: 'en', income: 'high' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.income_eligibility.score).toBe(0);
        });
    });

    describe('Category Matching', () => {
        it('should give perfect score for matching category and subcategory', () => {
            const request = { language: 'en', category: 'Legal', subcategory: 'Immigration' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.specialized_services.score).toBe(1);
        });

        it('should give partial score for matching category only', () => {
            const request = { language: 'en', category: 'Legal', subcategory: 'Employment' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.specialized_services.score).toBe(0.5);
        });
    });

    describe('Service Availability', () => {
        it('should score based on walk-in availability', () => {
            const request = { language: 'en' };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].rationale.factors.service_availability.score).toBe(0.7);
        });
    });

    describe('Integration Tests', () => {
        it('should find best matches for complex requests', () => {
            const request = {
                language: 'es',
                zipcode: '29605',
                income: 'low',
                category: 'Legal',
                subcategory: 'Immigration'
            };
            const matches = matcher.findMatchingResources(request);
            expect(matches[0].score).toBeGreaterThan(0.9);
            expect(matches[0].rationale.summary).toContain('Perfect match');
        });

        it('should respect minScore parameter', () => {
            const request = { language: 'fr' };
            const matches = matcher.findMatchingResources(request, 0.8);
            expect(matches.length).toBe(0);
        });

        it('should respect maxResults parameter', () => {
            const request = { language: 'en' };
            const matches = matcher.findMatchingResources(request, 0.5, 1);
            expect(matches.length).toBe(1);
        });
    });
}); 