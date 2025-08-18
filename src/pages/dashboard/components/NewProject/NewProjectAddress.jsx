import React, { useState } from "react";
import Map from "../../../../components/map";
import { NOMINATIM_SEARCH_URL, apiFetch } from "../../../../utils/api";

const NewProjectAddress = ({ address, setAddress, location, setLocation, style }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [buttonText, setButtonText] = useState('Search'); // Button text state
  const [isLoading, setIsLoading] = useState(false);

  const searchAddress = async (address) => {
    const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(address)}`;
    try {
      const response = await apiFetch(url);
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (error) {
      console.error("Error during address search:", error);
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
      setAddress(searchQuery); // Set the address to the searched query
      setButtonText('Updated'); // Temporarily show "Updated"
      setTimeout(() => setButtonText('Search'), 2000); // Revert back to "Search" after 2 seconds
      console.log("Updated Location:", geocodedLocation);
      console.log("Updated Address:", searchQuery);
    } else {
      setButtonText('No Results'); // Temporarily show "No Results"
      setTimeout(() => setButtonText('Search'), 2000); // Revert back to "Search" after 2 seconds
      console.log("No location found for the address.");
    }
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
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter address"
        />
        <button onClick={handleSearch} className="address-button" disabled={isLoading}>
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default NewProjectAddress;
