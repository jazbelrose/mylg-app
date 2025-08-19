import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { TweenLite, Power4 } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// Create a context for SmoothScroll
export const SmoothScrollContext = React.createContext({
    refreshScrollTrigger: () => { }
});
export default class SmoothScroll extends React.Component {
    state = {
        height: window.innerHeight
    };
    ro = null;
    componentDidMount() {
        window.addEventListener("scroll", this.onScroll);
        if (typeof ResizeObserver !== "undefined") {
            this.ro = new ResizeObserver((elements) => {
                for (let elem of elements) {
                    const crx = elem.contentRect;
                    this.setState({
                        height: crx.height
                    });
                }
                ScrollTrigger.update();
            });
            this.ro.observe(this.viewport);
        }
        // Update the fake div height to match the viewport content
        this.setState({
            height: this.viewport.scrollHeight
        });
    }
    componentWillUnmount() {
        window.removeEventListener("scroll", this.onScroll);
        if (this.ro) {
            this.ro.disconnect();
        }
    }
    onScroll = () => {
        TweenLite.to(this.viewport, 2, {
            y: -window.pageYOffset,
            ease: Power4.easeOut
        });
        ScrollTrigger.update(); // Ensure this line is present
    };
    // Define the refreshScrollTrigger method here
    refreshScrollTrigger = () => {
        ScrollTrigger.update();
    };
    render() {
        return (_jsxs(SmoothScrollContext.Provider, { value: { refreshScrollTrigger: this.refreshScrollTrigger }, children: [_jsx("div", { className: "viewport", ref: (ref) => (this.viewport = ref), children: this.props.children }), _jsx("div", { ref: (ref) => (this.fake = ref), style: {
                        height: this.state.height
                    } })] }));
    }
}
