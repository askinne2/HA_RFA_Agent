import { Context, ServerlessCallback } from '@twilio-labs/serverless-runtime-types/types';
import { ResourceMatcher } from '../../resources/matchers/resourceMatcher';

// Define the environment variables type
interface Environment {
    RESOURCE_GUIDE: string;
}

// Define the request parameters type
interface RequestParameters {
    language?: string;
    zipcode?: string;
    income?: string;
    age?: string;
    category?: string;
    subcategory?: string;
    latitude?: number;
    longitude?: number;
    minScore?: number;
    maxResults?: number;
}

export const handler = async (
    context: Context<Environment>,
    event: RequestParameters,
    callback: ServerlessCallback
) => {
    try {
        // Load the resource guide from the environment
        const resourceGuide = JSON.parse(context.RESOURCE_GUIDE || '{}');
        
        // Initialize the matcher
        const matcher = new ResourceMatcher(resourceGuide);
        
        // Convert request parameters to UserRequest format
        const userRequest = {
            language: event.language || 'en',
            zipcode: event.zipcode,
            income: event.income,
            age: event.age,
            category: event.category,
            subcategory: event.subcategory,
            latitude: event.latitude,
            longitude: event.longitude
        };
        
        // Get matching resources
        const matches = matcher.findMatchingResources(
            userRequest,
            event.minScore || 0.5,
            event.maxResults || 10
        );
        
        // Format the response
        const response = {
            success: true,
            matches: matches.map(match => ({
                score: match.score,
                rationale: match.rationale,
                resource: {
                    title: match.resource.title,
                    category: match.resource.category,
                    subcategories: match.resource.subcategories,
                    languages: match.resource.languages,
                    description: match.resource.description,
                    contact: match.resource.contact,
                    address: match.resource.address,
                    service_details: match.resource.service_details
                }
            }))
        };
        
        callback(null, response);
    } catch (error) {
        console.error('Error finding resources:', error);
        callback(null, {
            success: false,
            error: 'Failed to find matching resources',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}; 