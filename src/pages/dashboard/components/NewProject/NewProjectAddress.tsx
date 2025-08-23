import React, { useState, ChangeEvent } from 'react';
import Map from '../../../../components/map';
import { NOMINATIM_SEARCH_URL, apiFetch } from '../../../../utils/api';

interface Location {
  lat: number;
  lng: number;
}

interface NewProjectAddressProps {
  address: string;
  setAddress: (address: string) => void;
  location: Location;
  setLocation: (loc: Location) => void;
  style?: React.CSSProperties;
}

const NewProjectAddress: React.FC<NewProjectAddressProps> = ({
  address,
  setAddress,
  location,
  setLocation,
  style,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [buttonText, setButtonText] = useState('Search');
  const [isLoading, setIsLoading] = useState(false);

  const searchAddress = async (addr: string): Promise<Location | null> => {
    const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(addr)}`;
    try {
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (error) {
      console.error('Error during address search:', error);
      return null;
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setButtonText('Searching...');
    const geocodedLocation = await searchAddress(searchQuery);
    setIsLoading(false);
    if (geocodedLocation) {
      setLocation(geocodedLocation);
      setAddress(searchQuery);
      setButtonText('Updated');
      setTimeout(() => setButtonText('Search'), 2000);
      console.log('Updated Location:', geocodedLocation);
      console.log('Updated Address:', searchQuery);
    } else {
      setButtonText('No Results');
      setTimeout(() => setButtonText('Search'), 2000);
      console.log('No location found for the address.');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="column-new-project-address" style={style}>
      <div className="dashboard-item location">
        <Map location={location} address={address} />
      </div>
      <div className="address-input-container">
        <input
          type="text"
          className="address-input"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder="Enter address"
        />
        <button
          onClick={handleSearch}
          className="address-button"
          disabled={isLoading}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default NewProjectAddress;
