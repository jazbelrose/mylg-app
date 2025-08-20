import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./style.css";
import "../../index.css";
import Menuopened from "../../assets/svg/menu-open.svg?react";
import Menuclosed from "../../assets/svg/menu-closed.svg?react";
import User from "../../assets/svg/user.svg?react";
import { useAuth } from "../../app/contexts/AuthContext";
import { useScrollContext } from "../../app/contexts/ScrollContext";
import { signOut } from "aws-amplify/auth";
import useInactivityLogout from "../../app/contexts/useInactivityLogout";
import Cookies from "js-cookie";
import gsap from "gsap";
import { useData } from "../../app/contexts/DataProvider";
import { useOnlineStatus } from "../../app/contexts/OnlineStatusContext";
import ScrambleText from "scramble-text";
import { Bell } from "lucide-react";
import NavBadge from "../NavBadge";
import { useNotifications } from "../../app/contexts/NotificationContext";
import NotificationsDrawer from "../NotificationsDrawer";

const Headermain: React.FC = () => {
    useInactivityLogout();
    const location = useLocation();
    const navigate = useNavigate();
    const [isActive, setActive] = useState<boolean>(false);
    const menuAnimation = useRef<gsap.core.Timeline | null>(null);
    const scrollableDivRef = useRef<HTMLDivElement | null>(null);
    const [prevScrollPos, setPrevScrollPos] = useState<number>(0);
    const { isHeaderVisible, updateHeaderVisibility } = useScrollContext();
    const { isAuthenticated, setIsAuthenticated, setUser } = useAuth() as any;
    const { userData, settingsUpdated } = useData();
    const { onlineUsers } = useOnlineStatus();
    const isUserOnline = isAuthenticated &&
        userData &&
        !userData.pending &&
        onlineUsers.includes(userData.userId);
    const logoRef = useRef<HTMLAnchorElement | null>(null);
    const logoHoveredRef = useRef<boolean>(false);
    const [logoOriginalColor, setLogoOriginalColor] = useState<string | null>(null);
    const logoScrambleInstance = useRef<ScrambleText | null>(null);
    const { notifications } = useNotifications();
    const unreadCount = notifications.filter((n) => !n.read).length;
    const [isDrawerOpen, setDrawerOpen] = useState<boolean>(() => localStorage.getItem('notificationsPinned') === 'true');
    const [isPinned, setPinned] = useState<boolean>(() => localStorage.getItem('notificationsPinned') === 'true');

    useEffect(() => {
        if (isPinned) {
            localStorage.setItem('notificationsPinned', 'true');
            setDrawerOpen(true);
        } else {
            localStorage.removeItem('notificationsPinned');
        }
    }, [isPinned]);

    // Removed dropdown state/logic completely
    const getLinkClass = (path: string): string => {
        const currentPath = location.pathname.split(/[?#]/)[0];
        const isExactMatch = currentPath === path;
        const isSubpath = path !== "/" && currentPath.startsWith(`${path}/`);
        return isExactMatch || isSubpath ? "active-link" : "";
    };

    useEffect(() => {
        // Close any open menu when location changes or settings update
        // (Dropdown is removed so nothing to close)
    }, [location, settingsUpdated]);

    const handleSignOut = async (): Promise<void> => {
        if (isActive) {
            // Close the mobile nav menu if it's open
            handleToggle();
        }
        try {
            await signOut();
            setIsAuthenticated(false);
            setUser(null);
            navigate("/login");
            Cookies.remove("myCookie");
        } catch (error) {
            console.error("Error during sign out:", error);
        }
    };

    const handleScroll = (): void => {
        const currentScrollPos = window.scrollY;
        if (currentScrollPos <= 5) {
            updateHeaderVisibility(true);
        } else {
            const isScrollingUp = prevScrollPos > currentScrollPos;
            updateHeaderVisibility(isScrollingUp);
        }
        setPrevScrollPos(currentScrollPos);
    };

    useEffect(() => {
        const scrollableDiv = scrollableDivRef.current;
        if (scrollableDiv) {
            scrollableDiv.addEventListener("scroll", handleScroll);
        }
        return () => {
            if (scrollableDiv) {
                scrollableDiv.removeEventListener("scroll", handleScroll);
            }
        };
    });

    useEffect(() => {
        gsap.set(".span-open", {
            attr: { d: "M0 2S175 1 500 1s500 1 500 1V0H0Z" }
        });
        menuAnimation.current = gsap.timeline({ paused: true })
            .to(".span-open", {
                duration: 0.3,
                attr: { d: "M0 502S175 272 500 272s500 230 500 230V0H0Z" },
                ease: "Power2.easeIn",
                onStart: () => {
                    const navMenu = document.querySelector(".nav-bar-menu") as HTMLElement;
                    if (navMenu) {
                        navMenu.classList.add("opened");
                        gsap.set(".nav-bar-menu", { visibility: "visible" });
                    }
                },
                onReverseComplete: () => {
                    const navMenu = document.querySelector(".nav-bar-menu") as HTMLElement;
                    if (navMenu) {
                        navMenu.classList.remove("opened");
                    }
                }
            })
            .to(".span-open", {
                duration: 0.3,
                attr: { d: "M0,1005S175,995,500,995s500,5,500,5V0H0Z" },
                ease: "Power2.easeOut"
            })
            .to(".menu .menu-item > a", {
                duration: 0.3,
                opacity: 1,
                transform: "translateY(0)",
                stagger: 0.1,
                ease: "Power2.easeOut"
            })
            .eventCallback("onComplete", () => {
                setActive(true);
            });
    }, []);

    const handleToggle = (): void => {
        if (isActive) {
            document.body.classList.remove("ovhidden");
            if (menuAnimation.current) {
                menuAnimation.current.reverse();
                menuAnimation.current.eventCallback("onReverseComplete", () => setActive(false));
            } else {
                setActive(!isActive);
            }
        } else {
            document.body.classList.add("ovhidden");
            if (menuAnimation.current) {
                menuAnimation.current.play();
                menuAnimation.current.eventCallback("onComplete", () => setActive(true));
            } else {
                setActive(!isActive);
            }
        }
    };

    const handleDashboardHomeClick = (): void => {
        navigate("/dashboard");
    };

    const handleLogoMouseEnter = (): void => {
        if (logoScrambleInstance.current) return;
        logoHoveredRef.current = true;
        const logoElem = logoRef.current;
        const scrambledElem = logoElem?.querySelector(".scrambled") as HTMLElement;
        if (scrambledElem && logoElem) {
            logoElem.style.width = `${logoElem.offsetWidth}px`;
            logoScrambleInstance.current = new ScrambleText(scrambledElem, {
                timeOffset: 25,
                chars: ["o", "¦"],
                callback: () => {
                    if (logoHoveredRef.current) {
                        scrambledElem.style.color = "#FA3356";
                    }
                    logoScrambleInstance.current = null;
                }
            });
            logoScrambleInstance.current.start().play();
        }
    };

    const handleLogoMouseLeave = (): void => {
        logoHoveredRef.current = false;
        const scrambledElem = logoRef.current?.querySelector(".scrambled") as HTMLElement;
        if (scrambledElem) {
            scrambledElem.style.color = logoOriginalColor || "var(--text-color)";
        }
    };

    useEffect(() => {
        const scrambledElem = logoRef.current?.querySelector(".scrambled") as HTMLElement;
        if (scrambledElem) {
            setLogoOriginalColor(getComputedStyle(scrambledElem).color);
        }
        const handleResize = (): void => {
            const logoElem = logoRef.current;
            if (logoElem) {
                logoElem.style.width = "auto";
            }
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <>
            <header className={`fixed-top header ${isHeaderVisible ? "" : "hide"}`}>
                <div className="nav-bar">
                    <Link 
                        to="/" 
                        className="site-logo" 
                        ref={logoRef} 
                        onMouseEnter={handleLogoMouseEnter} 
                        onMouseLeave={handleLogoMouseLeave}
                    >
                        <span className="scrambled">*MYLG!*</span>
                    </Link>
                    <div className="nav-links">
                        <Link to="/works" className={`nav-link ${getLinkClass("/works")}`}>
                            SHOWCASE
                        </Link>
                        <div className="menu-item">
                            {isAuthenticated ? (
                                <Link 
                                    onClick={handleDashboardHomeClick} 
                                    to="/dashboard" 
                                    className={`my-3 sign-out-link ${getLinkClass("/dashboard")}`}
                                >
                                    DASHBOARD
                                </Link>
                            ) : (
                                <Link to="/login" className={`my-3 sign-out-link ${getLinkClass("/login")}`}>
                                    LOGIN
                                </Link>
                            )}
                        </div>
                        <div className="menu-item">
                            {isAuthenticated ? (
                                <Link onClick={handleSignOut} to="/login" className="my-3 sign-out-link">
                                    SIGN-OUT
                                </Link>
                            ) : (
                                <Link to="/register" className="my-3">
                                    SIGN UP
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="right-bar">
                        {isAuthenticated && userData && !userData.pending && (
                            <div className="user-first-name">{userData.firstName}</div>
                        )}
                        <div className="avatar-wrapper">
                            {isAuthenticated && userData ? (
                                userData.thumbnail ? (
                                    <img 
                                        src={userData.thumbnail} 
                                        alt={`${userData.firstName}'s Thumbnail`} 
                                        className="user-thumbnail" 
                                        onClick={handleDashboardHomeClick} 
                                    />
                                ) : (
                                    <button className="toggle-button" onClick={handleDashboardHomeClick}>
                                        <User />
                                    </button>
                                )
                            ) : (
                                <button className="toggle-button" onClick={handleDashboardHomeClick}>
                                    <User />
                                </button>
                            )}
                            {isUserOnline && <span className="online-indicator" />}
                        </div>
                        <div className="nav-icon-wrapper">
                            <button 
                                className="toggle-button" 
                                onClick={() => setDrawerOpen(!isDrawerOpen)} 
                                aria-label="Notifications"
                            >
                                <Bell size={24} color="white" />
                            </button>
                            <NavBadge count={unreadCount} label="notification" className="nav-bar-badge" />
                        </div>
                        <button className="toggle-button" onClick={handleToggle}>
                            {isActive ? <Menuopened /> : <Menuclosed />}
                        </button>
                    </div>
                </div>
                <div className="nav-bar-menu">
                    <div className="svg-wrapper">
                        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                            <path 
                                className="span-open" 
                                d="M0 2S175 1 500 1s500 1 500 1V0H0Z" 
                                fill="#0c0c0c" 
                            />
                        </svg>
                    </div>
                    <div className="menu-wrapper">
                        <div className="menu-container">
                            <ul className="menu">
                                <li className="menu-item">
                                    <Link onClick={handleToggle} to="/" className="my-3">
                                        HOME
                                    </Link>
                                </li>
                                <li className="menu-item">
                                    <Link 
                                        onClick={handleToggle} 
                                        to="/works" 
                                        className={`my-3 sign-out-link ${getLinkClass("/works")}`}
                                    >
                                        SHOWCASE
                                    </Link>
                                </li>
                                <li className="menu-item">
                                    {isAuthenticated ? (
                                        <Link 
                                            onClick={handleToggle} 
                                            to="/dashboard" 
                                            className={`my-3 sign-out-link ${getLinkClass("/dashboard")}`}
                                        >
                                            DASHBOARD
                                        </Link>
                                    ) : (
                                        <Link 
                                            onClick={handleToggle} 
                                            to="/login" 
                                            className={`my-3 sign-out-link ${getLinkClass("/login")}`}
                                        >
                                            LOGIN
                                        </Link>
                                    )}
                                </li>
                                <li className="menu-item">
                                    {isAuthenticated ? (
                                        <Link onClick={handleSignOut} to="/login" className="my-3 sign-out-link">
                                            SIGN-OUT
                                        </Link>
                                    ) : (
                                        <Link onClick={handleToggle} to="/register" className="my-3">
                                            SIGN UP
                                        </Link>
                                    )}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </header>
            <NotificationsDrawer 
                open={isDrawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                pinned={isPinned} 
                onTogglePin={() => setPinned((p) => !p)} 
            />
        </>
    );
};

export default Headermain;