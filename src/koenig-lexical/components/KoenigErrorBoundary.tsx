import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNearestNodeFromDOMNode} from 'lexical';
import {ErrorBoundary as ReactErrorBoundary} from 'react-error-boundary';
import {cardForNodeType, describeFailedCard, useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// The fallback finds the card it replaced from its own place in the document, so the message
// can say which card failed. Only the card's type and name are read; no document content.
function CardErrorFallback({}) {
    const strings = useKoenigStrings();
    const [editor] = useLexicalComposerContext();
    const ref = React.useRef(null);
    const [nodeType, setNodeType] = React.useState(null);

    React.useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        editor.read(() => {
            const node = $getNearestNodeFromDOMNode(element);
            setNodeType(node ? node.getType() : null);
        });
    }, [editor]);

    const card = nodeType ? cardForNodeType(nodeType) : undefined;
    const cardName = (card && strings.cards[card]?.label) || nodeType;

    return (
        <div
            ref={ref}
            className="border border-red p-2"
            data-kg-card-error={nodeType || 'unknown'}
            role="alert"
        >
            {describeFailedCard(strings, cardName)}
        </div>
    );
}

export default function KoenigErrorBoundary({children}) {
    const {onError} = React.useContext(KoenigComposerContext);

    return (
        <ReactErrorBoundary
            FallbackComponent={CardErrorFallback}
            onError={onError}
        >
            {children}
        </ReactErrorBoundary>
    );
}
