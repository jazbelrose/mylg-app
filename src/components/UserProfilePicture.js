import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import User from "../assets/svg/user.svg?react";
const UserProfilePicture = ({ thumbnail, localPreview, onChange }) => (_jsxs("div", { className: "form-group thumbnail-group", children: [_jsx("label", { htmlFor: "thumbnail", children: "Profile picture" }), _jsxs("label", { htmlFor: "thumbnail", className: "thumbnail-label", children: [localPreview || thumbnail ? (_jsx("img", { src: localPreview || thumbnail, alt: "Profile Thumbnail", className: "profile-thumbnail" })) : (_jsx(User, { className: "thumbnail-placeholder" })), _jsx("input", { type: "file", id: "thumbnail", className: "thumbnail-input", onChange: onChange })] })] }));
export default UserProfilePicture;
