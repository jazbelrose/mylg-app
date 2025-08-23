let React = require('react');
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ReactModal from 'react-modal';

// Ensure a root element exists for ReactModal
const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);
ReactModal.setAppElement(root);

// Mock pdfjs to avoid requiring optional native modules
jest.mock(
  'pdfjs-dist/legacy/build/pdf',
  () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: jest.fn(() => ({ promise: Promise.resolve({ numPages: 0 }) })),
  }),
  { virtual: true }
);

jest.mock('../../app/contexts/DataProvider', () => ({
  useData: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

jest.mock('../../utils/api', () => ({
  fetchGalleries: jest.fn(() => Promise.resolve([])),
}));

let GalleryPage;
import styles from './GalleryPage.module.css';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ text: () => Promise.resolve('<svg></svg>') })
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

const { useData } = require('../../app/contexts/DataProvider');
const { useParams, useNavigate } = require('react-router-dom');
const { fetchGalleries } = require('../../utils/api');

describe('GalleryPage', () => {
  beforeEach(() => {
    GalleryPage = require('./GalleryPage').default;
    useData.mockReturnValue({ projects: [] });
    fetchGalleries.mockResolvedValue([
      { name: 'client 001', slug: 'client-001', updatedSvgUrl: '/test.svg', imageUrls: ['img1.png'] },
    ]);
    useParams.mockReturnValue({ projectSlug: 'project-1', gallerySlug: 'client-001' });
    useNavigate.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders svg container', async () => {
    render(<GalleryPage projectId="1" />);
    expect(await screen.findByTestId('svg-container')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/test.svg');
  });

  it('toggles to masonry layout', async () => {
    render(<GalleryPage projectId="1" />);
    const toggle = await screen.findByTestId('layout-toggle');
    expect(screen.getByTestId('svg-container')).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByTestId('gallery-masonry')).toBeInTheDocument();
    expect(screen.queryByTestId('svg-container')).toBeNull();
  });

  it('redirects when only link is provided', async () => {
    const navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    useData.mockReturnValue({ projects: [] });
    fetchGalleries.mockResolvedValue([
      { name: 'link', slug: 'link', link: '/other' },
    ]);
    useParams.mockReturnValue({ projectSlug: 'project-2', gallerySlug: 'link' });
    render(<GalleryPage projectId="1" />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/other'));
  });

  it('prompts for password when enabled', async () => {
    useData.mockReturnValue({ projects: [] });
    fetchGalleries.mockResolvedValue([
      { name: 'secret', slug: 'secret', passwordHash: 'abc', passwordEnabled: true },
    ]);
    useParams.mockReturnValue({ projectSlug: 'project-3', gallerySlug: 'secret' });
    render(<GalleryPage projectId="1" />);
    const input = await screen.findByTestId('password-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass(styles.passwordInput);
  });

  it.skip('applies border radius from clipRadius', async () => {
    jest.resetModules();
    React = require('react');
    const pdfjs = require('pdfjs-dist/legacy/build/pdf');
    pdfjs.getDocument.mockImplementation(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve({
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
          getAnnotations: () => Promise.resolve([
            { url: 'img1.png', rect: [0, 0, 1, 1], clipRadius: 15 },
          ]),
        }),
      }),
    }));

    const { useData } = require('../../app/contexts/DataProvider');
    const { useParams } = require('react-router-dom');
    useData.mockReturnValue({ projects: [] });
    fetchGalleries.mockResolvedValue([
      { slug: 'pdf', updatedPdfUrl: '/dummy.pdf', imageUrls: ['img1.png'] },
    ]);
    useParams.mockReturnValue({ projectSlug: 'project-4', gallerySlug: 'pdf' });
    const { default: GalleryPagePdf } = require('./GalleryPage');
    render(<GalleryPagePdf />);
    expect(pdfjs.getDocument).toHaveBeenCalled();
  });

  it.skip('uses pdfContainer class for pdf galleries', async () => {
    jest.resetModules();
    React = require('react');
    const pdfjs = require('pdfjs-dist/legacy/build/pdf');
    pdfjs.getDocument.mockImplementation(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve({
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
          getAnnotations: () => Promise.resolve([]),
        }),
      }),
    }));

    const { useData } = require('../../app/contexts/DataProvider');
    const { useParams } = require('react-router-dom');
    useData.mockReturnValue({ projects: [] });
    fetchGalleries.mockResolvedValue([
      { slug: 'pdf', updatedPdfUrl: '/dummy.pdf' },
    ]);
    useParams.mockReturnValue({ projectSlug: 'project-5', gallerySlug: 'pdf' });
    const { default: GalleryPagePdf } = require('./GalleryPage');
    render(<GalleryPagePdf />);
    const container = await screen.findByTestId('svg-container');
    expect(container).toHaveClass(styles.pdfContainer);
  });
});