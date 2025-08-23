import React from 'react';

import User from '../assets/svg/user.svg?react';

export interface UserProfilePictureProps {
  thumbnail?: string | null;
  localPreview?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UserProfilePicture: React.FC<UserProfilePictureProps> = ({
  thumbnail,
  localPreview,
  onChange,
}) => (
  <div className="form-group thumbnail-group">
    <label htmlFor="thumbnail">Profile picture</label>
    <label htmlFor="thumbnail" className="thumbnail-label">
      {localPreview || thumbnail ? (
        <img
          src={localPreview || thumbnail || ''}
          alt="Profile Thumbnail"
          className="profile-thumbnail"
        />
      ) : (
        <User className="thumbnail-placeholder" />
      )}
      <input
        type="file"
        id="thumbnail"
        className="thumbnail-input"
        onChange={onChange}
      />
    </label>
  </div>
);

export default UserProfilePicture;

