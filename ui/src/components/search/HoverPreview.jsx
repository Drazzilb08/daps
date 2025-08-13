import { useRef, useEffect } from 'react';

export default function useHoverPreview() {
    const imgRef = useRef(null);

    useEffect(() => {
        let img = document.querySelector('.hover-preview');
        img = document.createElement('img');
        img.className = 'hover-preview';
        img.style.position = 'fixed';
        img.style.display = 'none';
        img.style.zIndex = 13000;
        document.body.appendChild(img);
        imgRef.current = img;

        return () => {
            if (img) {
                img.remove();
            }
            imgRef.current = null;
        };
    }, []);

    return imgRef;
}
