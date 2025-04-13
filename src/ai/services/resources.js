/**
 * Services for resource matching and formatting
 */
const fs = require('fs');
const path = require('path');

/**
 * Load the resource guide from disk
 * @returns {Object} Resource guide data
 */
function loadResourceGuide() {
  try {
    const resourceGuidePath = path.join(process.cwd(), 'data/resources/enhanced_resource_guide.json');
    console.log(`Loading resource guide from: ${resourceGuidePath}`);
    const fileContent = fs.readFileSync(resourceGuidePath, 'utf-8');
    const resourceGuide = JSON.parse(fileContent);
    console.log(`Successfully loaded resource guide with ${resourceGuide.resources.length} resources`);
    return resourceGuide;
  } catch (error) {
    console.error('Error loading resource guide:', error.message);
    // Return minimal fallback resource guide for testing
    return {
      version: "1.0",
      last_updated: "2025-04-12",
      resources: [],
      categories: {
        primary: ["Housing", "Education", "Healthcare", "Legal", "Employment"],
        subcategories: {
          "Housing": ["Rental", "Homeless", "Emergency"],
          "Education": ["ESL", "GED", "K-12"],
          "Healthcare": ["Medical", "Mental", "Dental"],
          "Legal": ["Immigration", "Criminal", "Civil"],
          "Employment": ["Job Search", "Training", "Resume"]
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
  }
}

/**
 * Find resources based on user parameters
 * @param {Object} params - Search parameters
 * @param {string} params.language - User language
 * @param {string} params.zipcode - User zipcode
 * @param {string} params.category - Requested resource category
 * @returns {Array} Matched resources
 */
function findMatchingResources(params) {
  const resourceGuide = loadResourceGuide();
  console.log('Using direct resource matching for:', params);
  
  // Normalize parameters
  const normalizedParams = {
    language: normalizeLanguage(params.language),
    zipcode: params.zipcode,
    category: params.category
  };
  
  // Log the matched parameters we're using
  console.log('Normalized params:', normalizedParams);
  
  // Filter resources by language, zipcode, and category
  const filteredResources = resourceGuide.resources.filter(resource => {
    // Check language match
    const resourceLanguages = resource.basic_info?.languages?.map(l => normalizeLanguage(l)) || [];
    const languageMatch = resourceLanguages.includes(normalizedParams.language);
    
    // Check zipcode match if provided
    let zipcodeMatch = true;
    if (normalizedParams.zipcode && normalizedParams.zipcode !== 'none') {
      // If the resource has zipcodes defined
      if (resource.eligibility?.service_area?.zipcodes?.length > 0) {
        zipcodeMatch = resource.eligibility.service_area.zipcodes.includes(normalizedParams.zipcode);
      }
    }
    
    // Check category match if provided
    let categoryMatch = true;
    if (normalizedParams.category) {
      // Case-insensitive comparison for categories
      const resourceCategory = resource.basic_info?.category || '';
      categoryMatch = resourceCategory.toLowerCase() === normalizedParams.category.toLowerCase();
      
      // If no direct category match, also check if it's Multi Services since those are general providers
      if (!categoryMatch && resourceCategory === 'Multi Services') {
        categoryMatch = true;
      }
    }
    
    const isMatch = languageMatch && zipcodeMatch && categoryMatch;
    
    // Debug log if this is a match
    if (isMatch) {
      console.log(`Match found: ${resource.basic_info.title_en} (Category: ${resource.basic_info.category})`);
    }
    
    return isMatch;
  });
  
  console.log(`Found ${filteredResources.length} matching resources`);
  
  // If no exact matches, try a more relaxed search for Multi Services
  if (filteredResources.length === 0) {
    const relaxedResources = resourceGuide.resources.filter(resource => {
      const resourceLanguages = resource.basic_info?.languages?.map(l => normalizeLanguage(l)) || [];
      const languageMatch = resourceLanguages.includes(normalizedParams.language);
      return languageMatch && resource.basic_info?.category === 'Multi Services';
    });
    
    if (relaxedResources.length > 0) {
      console.log(`Found ${relaxedResources.length} Multi Services resources as fallback`);
      return formatResourceMatches(relaxedResources, normalizedParams.language, 0.8);
    }
  }
  
  // Return the matches in the expected format
  return formatResourceMatches(filteredResources, normalizedParams.language, 0.9);
}

/**
 * Format resource matches into standardized format
 * @param {Array} resources - Matched resources
 * @param {string} language - User language
 * @param {number} baseScore - Base matching score
 * @returns {Array} Formatted resource matches
 */
function formatResourceMatches(resources, language, baseScore) {
  return resources.map((resource, index) => {
    // Decrease score slightly for later items to provide ranking
    const score = baseScore - (index * 0.02);
    
    return {
      score,
      resource: {
        title: language === 'es' && resource.basic_info?.title_es ? 
               resource.basic_info.title_es : 
               resource.basic_info.title_en,
        category: resource.basic_info?.category,
        subcategories: resource.basic_info?.subcategories,
        languages: resource.basic_info?.languages,
        description: language === 'es' && resource.basic_info?.description_es ? 
                    resource.basic_info.description_es : 
                    resource.basic_info.description_en,
        contact: {
          phone: resource.basic_info?.contact_phone,
          email: resource.basic_info?.contact_email,
          website: resource.basic_info?.website
        },
        address: resource.basic_info?.address
      },
      rationale: {
        summary: `Matched based on ${getMatchReason(resource, language)}`,
        factors: {}
      }
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Format resources into a text response
 * @param {Array} matches - Matched resources
 * @param {string} language - User language
 * @returns {string} Formatted text response
 */
function formatResourceResponse(matches, language) {
  if (matches.length === 0) {
    return language === 'es' 
      ? 'Lo siento, no pude encontrar recursos que coincidan con tu búsqueda.'
      : 'Sorry, I couldn\'t find any resources matching your search.';
  }
  
  const response = language === 'es'
    ? 'Aquí hay algunos recursos que pueden ayudarte:\n\n'
    : 'Here are some resources that might help you:\n\n';
  
  return response + matches.slice(0, 3).map(match => {
    const resource = match.resource;
    const title = resource.title || '[No Title Available]';
    const description = resource.description || '';
    const phone = resource.contact?.phone || '';
    const email = resource.contact?.email || '';
    const contact = [phone, email].filter(Boolean).join(' / ');
    
    let result = `${title}`;
    if (description) result += `\n${description}`;
    if (contact) result += `\nContact: ${contact}`;
    if (resource.address) result += `\nAddress: ${resource.address}`;
    if (resource.contact?.website) result += `\nWebsite: ${resource.contact.website}`;
    
    return result;
  }).join('\n\n');
}

/**
 * Get the reason for a resource match
 * @param {Object} resource - Resource object
 * @param {string} language - User language
 * @returns {string} Match reason
 */
function getMatchReason(resource, language) {
  const reasons = [];
  
  if (resource.basic_info?.languages?.map(l => normalizeLanguage(l)).includes(language)) {
    reasons.push("language accessibility");
  }
  
  if (resource.basic_info?.category) {
    reasons.push(`service type (${resource.basic_info.category})`);
  }
  
  if (resource.eligibility?.service_area?.zipcodes?.length > 0) {
    reasons.push("location");
  }
  
  return reasons.join(", ") || "general service availability";
}

/**
 * Normalize language codes for consistent comparison
 * @param {string} language - Language string
 * @returns {string} Normalized language code
 */
function normalizeLanguage(language) {
  if (!language) return 'en';
  
  const lowercased = language?.toLowerCase()?.trim();
  
  if (lowercased === 'english' || lowercased === 'inglés' || lowercased === 'ingles') return 'en';
  if (lowercased === 'spanish' || lowercased === 'español' || lowercased === 'espanol') return 'es';
  
  return lowercased;
}

module.exports = {
  loadResourceGuide,
  findMatchingResources,
  formatResourceResponse,
  normalizeLanguage
}; 