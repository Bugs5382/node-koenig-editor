import AudioPlugin from '../plugins/AudioPlugin';
import EmEnDashPlugin from '../plugins/EmEnDashPlugin';
import FilePlugin from '../plugins/FilePlugin';
import VideoPlugin from '../plugins/VideoPlugin';
import GalleryPlugin from '../plugins/GalleryPlugin';
import HeaderPlugin from '../plugins/HeaderPlugin';
import ButtonPlugin from '../plugins/ButtonPlugin';
import MarkdownCardPlugin from '../plugins/MarkdownCardPlugin';
import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import {CalloutPlugin} from '../plugins/CalloutPlugin';
import {CardMenuPlugin} from '../plugins/CardMenuPlugin';
import {KoenigSnippetPlugin} from '../plugins/KoenigSnippetPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {ReadOnlyGuardPlugin} from '../../additions/preview/ReadOnlyGuardPlugin';
import {AlignmentShortcutsPlugin} from '../../additions/alignment/AlignmentShortcutsPlugin';
import {InlineFormatShortcutsPlugin} from '../../additions/inlineFormats/InlineFormatShortcutsPlugin';
import {TablePlugin} from '../../additions/table/TablePlugin';
import {TogglePlugin} from '../plugins/TogglePlugin';
import {useKoenigPreview} from '../../additions/preview/PreviewContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// A card's plugin runs only when the composer registered its node: a host that leaves a card
// out (the composer's `cards` option) gets neither the card nor its commands.
const hasNode = (editor, type) => editor._nodes.has(type);

export const AllDefaultPlugins = () => {
    const [editor] = useLexicalComposerContext();
    const {preview} = useKoenigPreview();
    return (
        <>
            {/* Lexical Plugins */}
            <ListPlugin /> {/* adds indent/outdent/remove etc support */}
            {/* <TabIndentationPlugin /> tab/shift+tab triggers indent/outdent */}

            {/* Koenig Plugins */}
            {/* the "+" and "/" menus are editing chrome: not in the reader's view */}
            {!preview && <CardMenuPlugin />}
            <KoenigSnippetPlugin />
            <ReadOnlyGuardPlugin />

            {/* Card Plugins */}
            {hasNode(editor, 'image') && <ImagePlugin />}
            <EmEnDashPlugin />
            {hasNode(editor, 'horizontalrule') && <HorizontalRulePlugin />}
            {hasNode(editor, 'callout') && <CalloutPlugin />}
            {hasNode(editor, 'toggle') && <TogglePlugin />}
            {hasNode(editor, 'gallery') && <GalleryPlugin />}
            {hasNode(editor, 'header') && <HeaderPlugin />}
            {hasNode(editor, 'button') && <ButtonPlugin />}
            {hasNode(editor, 'markdown') && <MarkdownCardPlugin />}
            {hasNode(editor, 'file') && <FilePlugin />}
            {hasNode(editor, 'video') && <VideoPlugin />}
            {hasNode(editor, 'audio') && <AudioPlugin />}
            <TablePlugin />
            <AlignmentShortcutsPlugin />
            <InlineFormatShortcutsPlugin />
        </>
    );
};

export default AllDefaultPlugins;
