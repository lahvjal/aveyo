import { Project } from '@/types';

// Environment variable for Google Maps API key should be set in .env.local
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here

/**
 * Generate a Google Maps satellite view URL from an address
 * @param address The address to generate a satellite view for
 * @param zoom The zoom level (1-21, where 21 is the closest)
 * @param width The width of the image in pixels
 * @param height The height of the image in pixels
 * @returns A URL to a static satellite image of the address
 */
export const getSatelliteImageUrl = (address: string, zoom = 20, width = 600, height = 300): string => {
  // Default placeholder if no address or API key
  const placeholderUrl = 'https://via.placeholder.com/600x300?text=Satellite+View+Unavailable';
  
  if (!address) return placeholderUrl;
  
  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file');
    return placeholderUrl;
  }
  
  // Encode the address for the URL
  const encodedAddress = encodeURIComponent(address);
  
  // Generate the Google Maps Static API URL
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=${zoom}&size=${width}x${height}&maptype=satellite&key=${apiKey}`;
};

/**
 * Get the address from a project
 * @param project The project object
 * @returns The project address or an empty string
 */
export const getProjectAddress = (project: Project): string => {
  if (!project) return '';
  
  // Try to get address from the address field
  if (project.address) return project.address;
  
  // Try to get address from podio_data
  if (project.podio_data && project.podio_data.raw_payload) {
    const rawPayload = typeof project.podio_data.raw_payload === 'string' 
      ? JSON.parse(project.podio_data.raw_payload) 
      : project.podio_data.raw_payload;
      
    // Check for address fields in the payload
    if (rawPayload['address']) return rawPayload['address'];
    if (rawPayload['project-address']) return rawPayload['project-address'];
  }
  
  return '';
};

/**
 * Get a satellite view or home photo URL for a project
 * @param project The project object
 * @returns The satellite view URL, home photo URL, or a placeholder image URL
 */
export const getProjectHomePhotoUrl = (project: Project): string => {
  const placeholderUrl = 'https://via.placeholder.com/600x300?text=House+Image';

  if (!project) return placeholderUrl;

  // Prefer the uploaded home photo when available so the portal matches the intended property imagery.
  if (!project.podio_data || !project.podio_data.raw_payload) {
    const address = getProjectAddress(project);
    return address ? getSatelliteImageUrl(address) : placeholderUrl;
  }
  
  try {
    let homePhotoUrl: string | undefined;

    if (typeof project.podio_data.raw_payload === 'string') {
      try {
        const parsedPayload = JSON.parse(project.podio_data.raw_payload);
        homePhotoUrl = parsedPayload['home-photo-url'];
      } catch (parseError) {
        homePhotoUrl = undefined;
      }
    } else {
      homePhotoUrl = project.podio_data.raw_payload['home-photo-url'];
    }

    if (homePhotoUrl) {
      return homePhotoUrl;
    }

    const address = getProjectAddress(project);
    return address ? getSatelliteImageUrl(address) : placeholderUrl;
  } catch (error) {
    return placeholderUrl;
  }
};
