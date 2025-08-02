import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import UnsavedSettingsModal from '../modals/UnsavedSettingsModal';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';

// ---- CONTEXT ----
const UnsavedChangesContext = createContext();

export function UnsavedChangesProvider({ children }) {
    const [isDirty, setIsDirty] = useState(false);
    const [saveHandler, setSaveHandler] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [pendingNav, setPendingNav] = useState(null);

    const registerUnsavedChanges = useCallback((dirty, handler = null) => {
        setIsDirty(!!dirty);
        setSaveHandler(() => handler);
    }, []);

    useUnsavedChangesBlocker(isDirty, (nextLocation, retry) => {
        setShowModal(true);
        setPendingNav({ retry });
    });

    function handleModalSave() {
        if (saveHandler) saveHandler();
        setShowModal(false);
        pendingNav?.retry();
        setPendingNav(null);
    }
    function handleModalDiscard() {
        setShowModal(false);
        pendingNav?.retry();
        setPendingNav(null);
    }
    function handleModalCancel() {
        setShowModal(false);
        setPendingNav(null);
    }

    return (
        <UnsavedChangesContext.Provider value={{ isDirty, registerUnsavedChanges }}>
            {children}
            {showModal && (
                <UnsavedSettingsModal
                    onSave={handleModalSave}
                    onDiscard={handleModalDiscard}
                    onCancel={handleModalCancel}
                />
            )}
        </UnsavedChangesContext.Provider>
    );
}

export function useUnsavedChanges() {
    return useContext(UnsavedChangesContext);
}

// ---- BLOCKER HOOK ----
export function useUnsavedChangesBlocker(when, onAttemptNavigate) {
    const { navigator } = useContext(NavigationContext);
    const blocker = useRef();

    useEffect(() => {
        if (!when) return;
        const origPush = navigator.push;
        const origReplace = navigator.replace;

        navigator.push = (...args) => {
            blocker.current && blocker.current(args[0], () => origPush.apply(navigator, args));
        };
        navigator.replace = (...args) => {
            blocker.current && blocker.current(args[0], () => origReplace.apply(navigator, args));
        };

        return () => {
            navigator.push = origPush;
            navigator.replace = origReplace;
        };
    }, [when, navigator]);

    useEffect(() => {
        blocker.current = onAttemptNavigate;
    }, [onAttemptNavigate]);
}
