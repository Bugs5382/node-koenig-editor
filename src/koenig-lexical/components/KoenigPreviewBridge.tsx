import React from 'react';
import {KoenigPreviewProvider} from '../../additions/preview/PreviewContext';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';

// Gives the preview state to everything under it, and lets it let go of a selected or editing card
// when previewing starts (that state lives in the selected-card context, outside the document).
export function KoenigPreviewBridge({children, ...props}) {
    const {setSelectedCardKey, setIsEditingCard, setShowVisibilitySettings} = useKoenigSelectedCardContext();
    const onStart = React.useCallback(() => {
        setSelectedCardKey?.(null);
        setIsEditingCard?.(false);
        setShowVisibilitySettings?.(false);
    }, [setSelectedCardKey, setIsEditingCard, setShowVisibilitySettings]);
    return <KoenigPreviewProvider {...props} onStart={onStart}>{children}</KoenigPreviewProvider>;
}

export default KoenigPreviewBridge;
