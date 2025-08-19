import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import Map from "../../../../components/map";
import { toast, ToastContainer } from "react-toastify";
import Modal from "../../../../components/ModalWithStack";
import { NOMINATIM_SEARCH_URL, apiFetch } from "../../../../utils/api";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { FaPencilAlt, FaCrosshairs, FaLock, FaUnlock } from "react-icons/fa";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse?format=json";
if (typeof document !== "undefined") {
    Modal.setAppElement("#root");
}
const LocationComponent = ({ activeProject, onActiveProjectChange }) => {
    const { updateProjectFields, user } = useData();
    const [saving, setSaving] = useState(false);
    const { ws, onlineUsers } = useSocket();
    const [location, setLocation] = useState(activeProject.location || {});
    const [address, setAddress] = useState(activeProject.address || "");
    const [isInteractive, setIsInteractive] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLocation, setModalLocation] = useState(location);
    const [modalAddress, setModalAddress] = useState(address);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const mapRef = useRef(null);
    useEffect(() => {
        setLocation(activeProject.location || {});
        setAddress(activeProject.address || "");
    }, [activeProject]);
    useEffect(() => {
        if (!ws)
            return;
        const handler = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.action === "userLocation" &&
                    data.userId &&
                    data.userId !== user?.userId &&
                    data.location) {
                    setConnectedUsers((prev) => {
                        const others = prev.filter((u) => u.id !== data.userId);
                        return [
                            ...others,
                            {
                                id: data.userId,
                                lat: data.location.lat,
                                lng: data.location.lng,
                                accuracy: data.location.accuracy,
                                thumbnail: data.thumbnail,
                            },
                        ];
                    });
                }
            }
            catch (err) {
                console.error("Error handling websocket message:", err);
            }
        };
        ws.addEventListener("message", handler);
        return () => ws.removeEventListener("message", handler);
    }, [ws, user?.userId]);
    useEffect(() => {
        setConnectedUsers((prev) => prev.filter((u) => onlineUsers.includes(u.id)));
    }, [onlineUsers]);
    const openModal = () => {
        setModalLocation(location);
        setModalAddress(address);
        setSearchQuery(address || "");
        setSuggestions([]);
        setIsModalOpen(true);
    };
    const fetchSuggestions = async (query) => {
        const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(query)}&addressdetails=1&limit=5`;
        try {
            const response = await apiFetch(url);
            return await response.json();
        }
        catch (err) {
            console.error("Error fetching suggestions:", err);
            return [];
        }
    };
    const handleSearchChange = async (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (value.length > 2) {
            const results = await fetchSuggestions(value);
            setSuggestions(results);
        }
        else {
            setSuggestions([]);
        }
    };
    const handleSuggestionSelect = (s) => {
        const loc = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
        setModalLocation(loc);
        setModalAddress(s.display_name);
        setSearchQuery(s.display_name);
        setSuggestions([]);
    };
    const reverseGeocode = async (loc) => {
        const url = `${NOMINATIM_REVERSE_URL}&lat=${loc.lat}&lon=${loc.lng}`;
        try {
            const res = await apiFetch(url);
            const data = await res.json();
            return data.display_name || "";
        }
        catch (err) {
            console.error("Reverse geocode error:", err);
            return "";
        }
    };
    const handleModalLocationChange = async (loc) => {
        setModalLocation(loc);
        const addr = await reverseGeocode(loc);
        if (addr) {
            setModalAddress(addr);
            setSearchQuery(addr);
        }
    };
    const updateAddressToAPI = async (addr, loc) => {
        if (!activeProject || !activeProject.projectId)
            return false;
        const payload = { address: addr, location: loc };
        try {
            setSaving(true);
            await enqueueProjectUpdate(updateProjectFields, activeProject.projectId, payload);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "projectUpdated",
                    projectId: activeProject.projectId,
                    title: activeProject.title,
                    fields: payload,
                    conversationId: `project#${activeProject.projectId}`,
                }));
            }
            return true;
        }
        catch (error) {
            console.error("Error updating address and location:", error);
            return false;
        }
        finally {
            setSaving(false);
        }
    };
    const handleSave = async () => {
        if (!modalAddress || !modalLocation.lat || !modalLocation.lng) {
            toast.error("Please select a valid address.");
            return;
        }
        const success = await updateAddressToAPI(modalAddress, modalLocation);
        if (success) {
            onActiveProjectChange({ ...activeProject, address: modalAddress, location: modalLocation });
            setAddress(modalAddress);
            setLocation(modalLocation);
            setIsModalOpen(false);
            toast.success("Location saved successfully!");
        }
        else {
            toast.error("Failed to save location. Please try again.");
        }
    };
    const handleUserLocation = (loc) => {
        if (ws && ws.readyState === WebSocket.OPEN && user?.userId) {
            ws.send(JSON.stringify({
                action: "userLocation",
                userId: user.userId,
                location: loc,
                thumbnail: user?.thumbnail,
            }));
        }
    };
    return (_jsxs("div", { className: "column-5", style: { position: "relative" }, children: [saving && (_jsx("div", { style: { position: 'absolute', top: 0, right: 0, color: '#FA3356' }, children: "Saving..." })), _jsx(Map, { ref: mapRef, location: location.lat && location.lng ? location : { lat: 0, lng: 0 }, address: address || "No Address Provided", scrollWheelZoom: isInteractive, dragging: isInteractive, touchZoom: isInteractive, showUserLocation: true, userThumbnail: user?.thumbnail, projectThumbnail: activeProject?.thumbnails?.[0], otherUsers: connectedUsers, onUserLocation: handleUserLocation }), _jsxs("div", { className: "map-control-buttons", children: [_jsx("button", { className: "map-control-button", onClick: openModal, "aria-label": "Edit location", children: _jsx(FaPencilAlt, { size: 14 }) }), _jsx("button", { className: "map-control-button", onClick: () => mapRef.current?.locateUser(), "aria-label": "Use my location", children: _jsx(FaCrosshairs, { size: 14 }) }), _jsx("button", { className: "map-control-button", onClick: () => setIsInteractive(!isInteractive), "aria-label": "Toggle map interaction", children: isInteractive ? _jsx(FaLock, { size: 14 }) : _jsx(FaUnlock, { size: 14 }) })] }), _jsxs(Modal, { isOpen: isModalOpen, onRequestClose: () => setIsModalOpen(false), className: "map-edit-modal", overlayClassName: "map-edit-overlay", children: [_jsxs("div", { style: { position: "relative" }, children: [_jsx("input", { type: "text", className: "modal-input", value: searchQuery, onChange: handleSearchChange, placeholder: "Search address" }), suggestions.length > 0 && (_jsx("div", { className: "suggestions-list", children: suggestions.map((s) => (_jsx("div", { onClick: () => handleSuggestionSelect(s), children: s.display_name }, s.place_id))) }))] }), _jsx("div", { className: "modal-map", style: { flex: 1, marginTop: "10px" }, children: _jsx(Map, { location: modalLocation.lat && modalLocation.lng ? modalLocation : { lat: 0, lng: 0 }, address: modalAddress || "", scrollWheelZoom: true, dragging: true, touchZoom: true, showUserLocation: true, userThumbnail: user?.thumbnail, projectThumbnail: activeProject?.thumbnails?.[0], isEditable: true, onLocationChange: handleModalLocationChange }) }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }, children: [_jsx("button", { className: "modal-button secondary", onClick: () => setIsModalOpen(false), children: "Cancel" }), _jsx("button", { className: "modal-button primary", onClick: handleSave, children: "Save" })] })] }), _jsx(ToastContainer, { position: "bottom-right", theme: "dark" })] }));
};
export default LocationComponent;
