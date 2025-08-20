import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import SVGThumbnail from '../pages/dashboard/components/AllProjects/SVGThumbnail';
const ProjectAvatar = ({ thumb, name = '', initial = '', className = '' }) => (thumb ? (_jsx("img", { src: thumb, alt: name, className: className })) : (_jsx(SVGThumbnail, { initial: initial || name.charAt(0).toUpperCase(), className: className })));
export default ProjectAvatar;
