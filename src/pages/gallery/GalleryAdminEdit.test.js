import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
jest.mock('lucide-react', () => ({ GalleryVerticalEnd: () => _jsx("div", {}) }));
jest.mock('../../app/contexts/DataProvider', () => ({
    useData: jest.fn(),
}));
jest.mock('aws-amplify/storage', () => ({
    uploadData: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../utils/api', () => ({
    fetchGalleries: jest.fn(() => Promise.resolve([])),
    deleteGallery: jest.fn(() => Promise.resolve()),
    deleteGalleryFiles: jest.fn(() => Promise.resolve()),
    updateGallery: jest.fn(() => Promise.resolve()),
    apiFetch: jest.fn(() => Promise.resolve({})),
    S3_PUBLIC_BASE: 'https://mock-s3.com/public',
}));
import GalleryComponent from '../dashboard/components/SingleProject/GalleryComponent.js';
import { ToastContainer } from 'react-toastify';
import { MemoryRouter } from 'react-router-dom';
import Modal from 'react-modal';
// ensure root element exists for React Modal
const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);
Modal.setAppElement(root);
const { useData } = require('../../app/contexts/DataProvider');
const { apiFetch, deleteGallery, deleteGalleryFiles, updateGallery, S3_PUBLIC_BASE } = require('../../utils/api');
const { uploadData } = require('aws-amplify/storage');
describe('GalleryComponent admin edit', () => {
    let updateProjectFields;
    beforeEach(() => {
        updateProjectFields = jest.fn();
        useData.mockReturnValue({
            activeProject: { projectId: '1', galleries: [{ id: 'g1', name: 'Old', slug: 'old', url: 'http://a.com' }] },
            updateProjectFields,
            isAdmin: true,
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('allows admin to edit gallery details', async () => {
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Edit .* gallery/));
        const nameInput = screen.getByPlaceholderText('Gallery Name');
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'New Name');
        await userEvent.click(screen.getByText('Save'));
        const [projectId, fields] = updateProjectFields.mock.calls[0];
        expect(projectId).toBe('1');
        expect(Object.keys(fields)).toContain('galleries');
        expect(screen.getByText('New Name')).toBeInTheDocument();
    });
    it('supports editing when project uses "galleries"', async () => {
        useData.mockReturnValue({
            activeProject: {
                projectId: '2',
                galleries: [{ id: 'g2', name: 'Old2', slug: 'old2', url: 'http://b.com' }],
            },
            updateProjectFields,
            isAdmin: true,
        });
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Edit .* gallery/));
        await userEvent.type(screen.getByPlaceholderText('Gallery Name'), 'X');
        await userEvent.click(screen.getByText('Save'));
        const [projectId, fields] = updateProjectFields.mock.calls[0];
        expect(projectId).toBe('2');
        expect(Object.keys(fields)).toContain('galleries');
    });
    it('toggles password visibility', async () => {
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Edit .* gallery/));
        const pwdInput = screen.getByPlaceholderText('Password');
        expect(pwdInput).toHaveAttribute('type', 'password');
        const toggleBtn = screen.getByLabelText('Show password');
        await userEvent.click(toggleBtn);
        expect(pwdInput).toHaveAttribute('type', 'text');
    });
    it('allows admin to delete a gallery', async () => {
        render(_jsxs(MemoryRouter, { children: [_jsx(ToastContainer, {}), _jsx(GalleryComponent, {})] }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Delete .* gallery/));
        const yesButton = await screen.findByText('Yes');
        await userEvent.click(yesButton);
        await waitFor(() => expect(deleteGallery).toHaveBeenCalled());
        expect(deleteGalleryFiles).toHaveBeenCalled();
        expect(updateProjectFields).not.toHaveBeenCalled();
    });
    it('updates password enabled field', async () => {
        useData.mockReturnValue({
            activeProject: {
                projectId: '3',
                galleries: [
                    { galleryId: 'gid', name: 'Old', slug: 'old', url: 'http://a.com', passwordEnabled: true },
                ],
            },
            updateProjectFields,
            isAdmin: true,
        });
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Edit .* gallery/));
        const enableBox = screen.getByLabelText('Enable');
        await userEvent.click(enableBox);
        await userEvent.click(screen.getByText('Save'));
        await waitFor(() => expect(updateGallery).toHaveBeenCalled());
        const [galleryId, fields] = updateGallery.mock.calls[0];
        expect(galleryId).toBe('gid');
        expect(fields.passwordEnabled).toBe(false);
    });
    it('uploads new cover image and updates gallery', async () => {
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Change cover for .* gallery/));
        const fileInput = document.querySelector('input[accept="image/*"]');
        const file = new File(['abc'], 'cover.png', { type: 'image/png' });
        await userEvent.upload(fileInput, file);
        await waitFor(() => expect(updateGallery).toHaveBeenCalled());
        const [galleryId] = updateGallery.mock.calls[0];
        expect(galleryId).toBe('g1');
    });
    it('selects existing cover image from modal', async () => {
        useData.mockReturnValue({
            activeProject: {
                projectId: '1',
                galleries: [
                    {
                        id: 'g1',
                        name: 'Old',
                        slug: 'old',
                        imageUrls: ['https://img1', 'https://img2'],
                    },
                ],
            },
            updateProjectFields,
            isAdmin: true,
        });
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Change cover for .* gallery/));
        const option = await screen.findByAltText('Cover option 1');
        await userEvent.click(option);
        await waitFor(() => expect(updateGallery).toHaveBeenCalled());
        const [galleryId, fields] = updateGallery.mock.calls[0];
        expect(galleryId).toBe('g1');
        expect(fields.coverImageUrl).toBe('https://img1');
    });
    it('updates preview after new cover upload', async () => {
        const fixedTime = 12345;
        jest.spyOn(Date, 'now').mockReturnValue(fixedTime);
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Change cover for .* gallery/));
        const fileInput = document.querySelector('input[accept="image/*"]');
        const file = new File(['abc'], 'cover.png', { type: 'image/png' });
        await userEvent.upload(fileInput, file);
        const expectedUrl = `${S3_PUBLIC_BASE}/projects/1/galleries/g1/cover/cover.png?t=${fixedTime}`;
        await waitFor(() => {
            expect(updateGallery).toHaveBeenCalled();
        });
        const img = document.querySelector('img');
        expect(img.getAttribute('src')).toBe(expectedUrl);
        Date.now.mockRestore();
    });
    it('uploads cover for legacy gallery without id using slug', async () => {
        const fixedTime = 555;
        jest.spyOn(Date, 'now').mockReturnValue(fixedTime);
        updateProjectFields = jest.fn();
        useData.mockReturnValue({
            activeProject: { projectId: '1', gallery: [{ name: 'Legacy', link: '/legacy' }] },
            updateProjectFields,
            isAdmin: true,
        });
        render(_jsx(MemoryRouter, { children: _jsx(GalleryComponent, {}) }));
        await userEvent.click(screen.getByText('Galleries'));
        await userEvent.click(screen.getByLabelText(/Change cover for .* gallery/));
        const fileInput = document.querySelector('input[accept="image/*"]');
        const file = new File(['abc'], 'my cover.png', { type: 'image/png' });
        await userEvent.upload(fileInput, file);
        await waitFor(() => expect(updateProjectFields).toHaveBeenCalled());
        const [projectId, fields] = updateProjectFields.mock.calls[0];
        expect(projectId).toBe('1');
        const img = document.querySelector('img');
        const expectedSrc = `${S3_PUBLIC_BASE}/projects/1/galleries/legacy/cover/my%20cover.png?t=${fixedTime}`;
        expect(fields.gallery[0].coverImageUrl).toBe(expectedSrc);
        expect(img.getAttribute('src')).toBe(expectedSrc);
        Date.now.mockRestore();
    });
});
