import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
const SVGThumbnail = ({ initial, className }) => {
    // Adjusted center calculations for the new size
    const centerX = 125; // Half of 250
    const centerY = 142; // Half of 250
    return (_jsxs("svg", { className: className, width: "250", height: "250", viewBox: "0 0 250 250", xmlns: "http://www.w3.org/2000/svg", children: [_jsxs("text", { x: centerX, y: centerY, textAnchor: "middle", dominantBaseline: "middle", style: { fill: "#fff", fontFamily: "HelveticaNeueLT-Roman, 'HelveticaNeue LT 55 Roman', 'Helvetica'", fontSize: "180px" }, children: [" ", initial] }), _jsx("rect", { x: "7", y: "7", width: "236", height: "236", rx: "35", ry: "35", style: { fill: "none", stroke: "#fff", strokeMiterlimit: 10, strokeWidth: "7px" } })] }));
};
export default SVGThumbnail;
