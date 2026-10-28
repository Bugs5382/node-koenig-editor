import EmEnDashPlugin from '../plugins/EmEnDashPlugin';
import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import {CalloutPlugin} from '../plugins/CalloutPlugin';
import {CardMenuPlugin} from '../plugins/CardMenuPlugin';
import {KoenigSnippetPlugin} from '../plugins/KoenigSnippetPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {TablePlugin} from '../../additions/table/TablePlugin';
import {TogglePlugin} from '../plugins/TogglePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// A card's plugin runs only when the composer registered its node: a host that leaves a card
// out (the composer's `cards` option) gets neither the card nor its commands.
const hasNode = (editor, type) => editor._nodes.has(type);

export const AllDefaultPlugins = () => {
    const [editor] = useLexicalComposerContext();
    return (
        <>
            {/* Lexical Plugins */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
            {/* <TabIndentationPlugin /> tab/shift+tab triggers indent/outdent */}

            {/* Koenig Plugins */}
            <CardMenuPlugin />
            <KoenigSnippetPlugin />

            {/* Card Plugins */}
            {hasNode(editor, 'image') && <ImagePlugin />}
            <EmEnDashPlugin />
            {hasNode(editor, 'horizontalrule') && <HorizontalRulePlugin />}
            {hasNode(editor, 'callout') && <CalloutPlugin />}
            {hasNode(editor, 'toggle') && <TogglePlugin />}
            <TablePlugin />
        </>
    );
};

export default AllDefaultPlugins;
