import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {ErrorBoundary as ReactErrorBoundary} from 'react-error-boundary';
import {useKoenigStrings} from '../../additions/options';

export default function KoenigErrorBoundary({children}) {
    const strings = useKoenigStrings();
    const {onError} = React.useContext(KoenigComposerContext);

    return (
        <ReactErrorBoundary
            fallback={<div className="border border-red p-2">{strings.errorFallback}</div>}
            onError={onError}
        >
            {children}
        </ReactErrorBoundary>
    );
}
