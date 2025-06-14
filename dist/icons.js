var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
var defaultSize = 24;
export var HomeIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-home ".concat(className) }, props, { children: [_jsx("path", { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }), _jsx("polyline", { points: "9 22 9 12 15 12 15 22" })] })));
};
export var SearchIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-search ".concat(className) }, props, { children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("path", { d: "m21 21-4.3-4.3" })] })));
};
export var ListIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-list ".concat(className) }, props, { children: [_jsx("line", { x1: "8", x2: "21", y1: "6", y2: "6" }), _jsx("line", { x1: "8", x2: "21", y1: "12", y2: "12" }), _jsx("line", { x1: "8", x2: "21", y1: "18", y2: "18" }), _jsx("line", { x1: "3", x2: "3.01", y1: "6", y2: "6" }), _jsx("line", { x1: "3", x2: "3.01", y1: "12", y2: "12" }), _jsx("line", { x1: "3", x2: "3.01", y1: "18", y2: "18" })] })));
};
export var UserIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-user ".concat(className) }, props, { children: [_jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] })));
};
export var ChevronDownIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-chevron-down ".concat(className) }, props, { children: _jsx("path", { d: "m6 9 6 6 6-6" }) })));
};
export var ChevronUpIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-chevron-up ".concat(className) }, props, { children: _jsx("path", { d: "m18 15-6-6-6 6" }) })));
};
export var ChevronLeftIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-chevron-left ".concat(className) }, props, { children: _jsx("path", { d: "m15 18-6-6 6-6" }) })));
};
export var ChevronRightIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-chevron-right ".concat(className) }, props, { children: _jsx("path", { d: "m9 18 6-6-6-6" }) })));
};
export var XIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-x ".concat(className) }, props, { children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] })));
};
export var PlusIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-plus ".concat(className) }, props, { children: [_jsx("path", { d: "M5 12h14" }), _jsx("path", { d: "M12 5v14" })] })));
};
export var EditIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-edit-2 ".concat(className) }, props, { children: _jsx("path", { d: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" }) })));
};
export var TrashIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-trash-2 ".concat(className) }, props, { children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }), _jsx("line", { x1: "10", y1: "11", x2: "10", y2: "17" }), _jsx("line", { x1: "14", y1: "11", x2: "14", y2: "17" })] })));
};
export var EyeIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-eye ".concat(className) }, props, { children: [_jsx("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] })));
};
export var EyeOffIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-eye-off ".concat(className) }, props, { children: [_jsx("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }), _jsx("path", { d: "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" }), _jsx("path", { d: "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" }), _jsx("line", { x1: "2", x2: "22", y1: "2", y2: "22" })] })));
};
export var BookmarkIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-bookmark ".concat(className) }, props, { children: _jsx("path", { d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" }) })));
};
export var StarIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, _d = _a.fill, fill = _d === void 0 ? "none" : _d, props = __rest(_a, ["size", "className", "fill"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: fill, stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-star ".concat(className) }, props, { children: _jsx("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" }) })));
};
export var TrendingUpIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-trending-up ".concat(className) }, props, { children: [_jsx("polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17" }), _jsx("polyline", { points: "16 7 22 7 22 13" })] })));
};
export var TvIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-tv ".concat(className) }, props, { children: [_jsx("rect", { width: "20", height: "15", x: "2", y: "7", rx: "2", ry: "2" }), _jsx("polyline", { points: "17 2 12 7 7 2" })] })));
};
export var FilmIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-film ".concat(className) }, props, { children: [_jsx("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }), _jsx("path", { d: "M7 3v18" }), _jsx("path", { d: "M3 7.5h4" }), _jsx("path", { d: "M3 12h18" }), _jsx("path", { d: "M3 16.5h4" }), _jsx("path", { d: "M17 3v18" }), _jsx("path", { d: "M17 7.5h4" }), _jsx("path", { d: "M17 16.5h4" })] })));
};
export var CheckIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-check ".concat(className) }, props, { children: _jsx("path", { d: "M20 6 9 17l-5-5" }) })));
};
export var ExternalLinkIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsxs("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-external-link ".concat(className) }, props, { children: [_jsx("path", { d: "M15 3h6v6" }), _jsx("path", { d: "M10 14 21 3" }), _jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" })] })));
};
export var HeartIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, _d = _a.fill, fill = _d === void 0 ? "none" : _d, props = __rest(_a, ["size", "className", "fill"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: fill, stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "lucide lucide-heart ".concat(className) }, props, { children: _jsx("path", { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" }) })));
};
// Placeholder for Gemini Icon
export var GeminiIcon = function (_a) {
    var _b = _a.size, size = _b === void 0 ? defaultSize : _b, _c = _a.className, className = _c === void 0 ? '' : _c, props = __rest(_a, ["size", "className"]);
    return (_jsx("svg", __assign({ xmlns: "http://www.w3.org/2000/svg", width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", className: "text-purple-500 ".concat(className) }, props, { children: _jsx("path", { d: "M12.682 2.76C12.436 2.332 11.936 2.07 11.4 2.074c-.536.004-.943.348-1.185.77l-4.236 7.06c-.242.422-.242 1.062 0 1.484l4.236 7.06c.242.422.742.77 1.185.77.536 0 1.036-.258 1.282-.686l4.236-7.06c.242-.422.242-1.062 0-1.484l-4.236-7.06zM12 14.47a2.47 2.47 0 110-4.94 2.47 2.47 0 010 4.94z" }) })));
};
