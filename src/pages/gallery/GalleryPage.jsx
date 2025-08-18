import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { sha256 } from "../../utils/hash";
import ReactModal from "react-modal";
import useModalStack from "../../utils/useModalStack";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../../app/contexts/DataProvider";
import { slugify, findProjectBySlug } from "../../utils/slug";
import { fetchGalleries } from "../../utils/api";
import styles from "./GalleryPage.module.css";
import Preloader from "../../components/preloader";
import * as pdfjsLibLocal from "pdfjs-dist/legacy/build/pdf";
import GalleryMasonry from "./GalleryMasonry";
import LayoutPdfButtons from "../../components/LayoutPdfButtons";

let pdfjsLib = null;
const pdfScale = 1.5;
const renderScale = 2; // scale used when rendering pages in Lambda

const GalleryPage = ({ projectId: propProjectId }) => {
  const { gallerySlug, projectSlug } = useParams();
  const { projects } = useData();
  const projectObj = useMemo(() => findProjectBySlug(projects, projectSlug), [projects, projectSlug]);
  const projectId = propProjectId || projectObj?.projectId;
  const navigate = useNavigate();

  if (import.meta.env.DEV) {
    console.log("Loaded projects in GalleryPage:", projects);
    console.log("Slug from URL (gallerySlug):", gallerySlug);
    console.log("Project slug:", projectSlug);
    console.log("Resolved project ID:", projectId);
  }

  if (typeof document !== "undefined") {
    ReactModal.setAppElement("#root");
  }

  const [apiGalleries, setApiGalleries] = useState(null);
  const [loadingGalleries, setLoadingGalleries] = useState(!!projectId);

const gallery = useMemo(() => {
  let list = [];
  if (Array.isArray(apiGalleries) && apiGalleries.length > 0) {
    list = apiGalleries;
  } else {
    for (const project of projects || []) {
      if (projectId && project.projectId !== projectId) continue;
      const legacy = Array.isArray(project.gallery) ? project.gallery : [];
      const current = Array.isArray(project.galleries) ? project.galleries : [];
      list = list.concat(legacy, current);
    }
  }
  for (const g of list) {
    const slug = g.slug || slugify(g.name || "");
    if (slug === gallerySlug) {
      return g;
    }
  }
  return null;
}, [apiGalleries, projects, gallerySlug, projectId]);

if (import.meta.env.DEV) {
  console.log("Resolved gallery for slug:", gallery);
}

  const passwordEnabled =
    gallery?.passwordEnabled !== false && gallery?.passwordHash;
  const timeout = gallery?.passwordTimeout || 15 * 60 * 1000;
  const storageKey = `gallery-${gallerySlug}-verified`;
  const [pwd, setPwd] = useState("");
  const [unlocked, setUnlocked] = useState(() => {
    if (!passwordEnabled) return true;
    try {
      const ts = localStorage.getItem(storageKey);
      return ts && Date.now() - parseInt(ts, 10) < timeout;
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [svgContent, setSvgContent] = useState("");
  const [pdfPages, setPdfPages] = useState([]);
  const [pageDims, setPageDims] = useState({});
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useModalStack(isModalOpen);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const svgContainerRef = useRef(null);
  const [useMasonryLayout, setUseMasonryLayout] = useState(false);

  const updatedSvgUrl = gallery?.updatedSvgUrl || gallery?.url;
  const originalSvgUrl =
    gallery?.originalSvgUrl || gallery?.svgUrl || gallery?.originalUrl;
  const updatedPdfUrl = gallery?.updatedPdfUrl;
  const originalPdfUrl = gallery?.originalPdfUrl;
  const isPdf = !!(updatedPdfUrl || originalPdfUrl);
  const updatedUrl = updatedSvgUrl || updatedPdfUrl;
  const originalUrl = originalSvgUrl || originalPdfUrl;
  const imageUrls = useMemo(
    () =>
      Array.isArray(gallery?.imageUrls)
        ? gallery.imageUrls
        : gallery?.images || [],
    [gallery]
  );
  const pageImageUrls = useMemo(
    () =>
      Array.isArray(gallery?.pageImageUrls) ? gallery.pageImageUrls : [],
    [gallery]
  );
  const usePageImages = pageImageUrls.length > 0;
  const imageMap = useMemo(
    () => (Array.isArray(gallery?.imageMap) ? gallery.imageMap : []),
    [gallery]
  );

  useEffect(() => {
    if (!projectId) {
      setApiGalleries(null);
      setLoadingGalleries(false);
      return;
    }
    let cancelled = false;
    setLoadingGalleries(true);
    fetchGalleries(projectId)
      .then((list) => {
        if (!cancelled) setApiGalleries(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error('Failed to fetch galleries', err);
        if (!cancelled) setApiGalleries([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGalleries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!passwordEnabled) {
      setUnlocked(true);
      return;
    }
    try {
      const ts = localStorage.getItem(storageKey);
      setUnlocked(ts && Date.now() - parseInt(ts, 10) < timeout);
    } catch {
      setUnlocked(false);
    }
  }, [passwordEnabled, storageKey, timeout]);

  useEffect(() => {
    if (!unlocked) {
      setLoading(false);
      return;
    }

    if (!updatedUrl && !originalUrl) {
      if (gallery?.link) {
        const hasProtocol = /^https?:\/\//i.test(gallery.link);
        const target = hasProtocol || gallery.link.startsWith('/')
          ? gallery.link
          : `/${gallery.link}`;
        if (hasProtocol) {
          window.location.assign(target);
        } else {
          navigate(target);
        }
      }
      setLoading(false);
      return;
    }

    setError("");

    if (isPdf) {
      if (usePageImages && pageImageUrls.length > 0) {
        const pages = pageImageUrls.map((src, idx) => ({
          src,
          annots: imageMap.filter((a) => a.page === idx + 1),
        }));
        setPdfPages(pages);
        setTotalPages(pages.length);
        setPagesLoaded(pages.length);
        setLoading(false);
      } else {
        if (!pdfjsLib) {
          pdfjsLib = pdfjsLibLocal;
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://d2qb21tb4meex0.cloudfront.net/pdfWorker/pdf.worker.js";
        }
        setLoading(true);
        pdfjsLib
          .getDocument(updatedPdfUrl || originalPdfUrl)
          .promise.then(async (doc) => {
            setTotalPages(doc.numPages);
            setPagesLoaded(0);

            const loadPage = async (i) => {
              const page = await doc.getPage(i);
              const viewport = page.getViewport({ scale: pdfScale });
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: ctx, viewport }).promise;
              const annots = (await page.getAnnotations()).filter(
                (a) => a.url && imageUrls.includes(a.url)
              );
              return {
                src: canvas.toDataURL(),
                width: canvas.width,
                height: canvas.height,
                annots,
              };
            };

            const pages = [];

            for (let i = 1; i <= doc.numPages; i++) {
              const page = await loadPage(i);
              pages.push(page);
              setPdfPages([...pages]);
              setPagesLoaded(i);
              if (i === 1) {
                setLoading(false);
              }
            }
          })
          .catch((err) => {
            console.error("Failed to load PDF", err);
            setError("Failed to load gallery. Please try again later.");
            setLoading(false);
          });
      }
    } else {
      setLoading(true);
      fetch(updatedSvgUrl)
        .then((res) => res.text())
        .then((text) => {
          setSvgContent(text);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch SVG", err);
          setError("Failed to load gallery. Please try again later.");
          setLoading(false);
        });
    }
  }, [
    updatedUrl,
    unlocked,
    navigate,
    gallery?.link,
    isPdf,
    updatedPdfUrl,
    originalPdfUrl,
    originalUrl,
    imageUrls,
    updatedSvgUrl,
    usePageImages,
    pageImageUrls,
    imageMap,
  ]);

  useEffect(() => {
    if (isPdf) return;
    if (!svgContent || !svgContainerRef.current) return;
    const svgEl = svgContainerRef.current.querySelector("svg");
    if (!svgEl) return;
    const uses = Array.from(svgEl.querySelectorAll("use")).filter((el) => {
      const href =
        el.getAttribute("href") ||
        el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      return href && href.startsWith("#_Image");
    });
    uses.forEach((el, idx) => {
      el.style.cursor = "pointer";
      el.onclick = () => {
        setCurrentIndex(idx);
        setIsModalOpen(true);
      };
    });
    return () => {
      uses.forEach((el) => {
        el.onclick = null;
      });
    };
  }, [svgContent, isPdf]);

  const closeModal = () => {
    setIsModalOpen(false);
    if (document && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
  const nextImage = useCallback(
    () => setCurrentIndex((i) => (i + 1) % imageUrls.length),
    [imageUrls.length]
  );
  const prevImage = useCallback(
    () => setCurrentIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length),
    [imageUrls.length]
  );

  useEffect(() => {
    if (!isModalOpen) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isModalOpen, imageUrls.length, nextImage, prevImage]);

  const verify = async (e) => {
    e.preventDefault();
    const hashHex = await sha256(pwd);
    if (hashHex === gallery.passwordHash) {
      try {
        localStorage.setItem(storageKey, Date.now().toString());
      } catch {}
      setUnlocked(true);
    } else {
      alert("Incorrect password");
    }
  };

  if (loadingGalleries && !gallery) {
    return <Preloader />;
  }

  if (!gallery) {
    return <div data-testid="no-gallery">Gallery not found</div>;
  }

  if (!unlocked) {
    return (
      <div className={styles.passwordWrapper}>
        <form onSubmit={verify} className={styles.passwordContainer}>
          <h2>Enter Password</h2>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            data-testid="password-input"
            className={styles.passwordInput}
          />
          <button type="submit" className={styles.button}>
            Submit
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`gallery-page ${styles.galleryPage}`}>
      {(loading || loadingGalleries) && <Preloader />}
      {error && <p className="text-danger mt-3">{error}</p>}
      <LayoutPdfButtons
        useMasonryLayout={useMasonryLayout}
        onToggleLayout={() => setUseMasonryLayout((v) => !v)}
        downloadUrl={originalUrl}
        isPdf={isPdf}
      />
      {useMasonryLayout ? (
        <GalleryMasonry
          imageUrls={imageUrls}
          onImageClick={(i) => {
            setCurrentIndex(i);
            setIsModalOpen(true);
          }}
        />
      ) : isPdf ? (
        <div data-testid="svg-container" className={styles.pdfContainer}>
          {totalPages > 0 && pagesLoaded < totalPages && (
            <div className={styles.loadingOverlay} data-testid="pdf-loading">
              <div className={styles.dotSpinner}>
                <div></div>
                <div></div>
                <div></div>
              </div>
              <span>
                Loading {pagesLoaded}/{totalPages}
              </span>
            </div>
          )}
          {pdfPages.map((p, pageIdx) => (
            <div key={pageIdx} style={{ position: "relative", width: "100%" }}>
              <img
                src={p.src}
                alt={`Page ${pageIdx + 1}`}
                style={{ width: "100%", height: "auto" }}
                onLoad={(e) => {
                  setPageDims((d) => ({
                    ...d,
                    [pageIdx]: {
                      width: e.target.naturalWidth,
                      height: e.target.naturalHeight,
                    },
                  }));
                }}
              />
              {p.annots.map((a, idx) => {
                const dims = pageDims[pageIdx];
                if (!dims) return null;
                const rect = a.rect;
                const scale = usePageImages ? renderScale : pdfScale;
                const top = usePageImages
                  ? ((rect[1] * scale) / dims.height) * 100
                  : ((dims.height - rect[3] * scale) / dims.height) * 100;
                const left = ((rect[0] * scale) / dims.width) * 100;
                const width =
                  (((rect[2] - rect[0]) * scale) / dims.width) * 100;
                const height =
                  (((rect[3] - rect[1]) * scale) / dims.height) * 100;
                const imageIndex = imageUrls.indexOf(a.url);
                return (
                  <button
                    key={idx}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setCurrentIndex(imageIndex);
                      setIsModalOpen(true);
                    }}
                    aria-label={`Open image ${imageIndex + 1}`}
                  ></button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={svgContainerRef}
          data-testid="svg-container"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className={styles["modal-content"]}
        overlayClassName={styles.modal}
        ariaHideApp={false}
      >
        <button
          onClick={prevImage}
          className={`${styles.navButton} ${styles.prevButton}`}
          aria-label="Previous image"
        >
          ❮
        </button>
        <img
          src={imageUrls[currentIndex]}
          alt={`Gallery item ${currentIndex + 1}`}
          className={styles.modalImage}
        />
        <button
          onClick={nextImage}
          className={`${styles.navButton} ${styles.nextButton}`}
          aria-label="Next image"
        >
          ❯
        </button>
      </ReactModal>
    </div>
  );
};

export default GalleryPage;
