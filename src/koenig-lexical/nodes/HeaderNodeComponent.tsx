import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey, $getRoot} from 'lexical';
import KoenigCaptionEditor from '../components/KoenigCaptionEditor';
import {KoenigHeaderCard} from '../components/KoenigHeaderCard';
import {getImageDimensions} from '../utils/getImageDimensions';
import {populateNestedEditor} from '../utils/nested-editors';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const NODE_FIELDS = [
    'alignment', 'backgroundColor', 'backgroundImageSrc', 'backgroundImageWidth', 'backgroundImageHeight',
    'buttonColor', 'buttonEmoji', 'buttonEnabled', 'buttonText', 'buttonTextColor', 'buttonUrl', 'layout', 'textColor'
];

const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = nestedEditor => nestedEditor.getEditorState().read(() => $getRoot().getTextContent());

function HeaderNodeComponent({
    alignment,
    backgroundColor,
    backgroundImageSrc,
    buttonColor,
    buttonEnabled,
    buttonEmoji,
    buttonText,
    buttonTextColor,
    buttonUrl,
    headerTextEditor,
    headerTextEditorInitialState,
    layout,
    nodeKey,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    textColor
}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardRenderers} = React.useContext(KoenigComposerContext);
    const {isEditing, isSelected} = React.useContext(CardContext);
    const strings = useKoenigStrings();
    const imageUploader = fileUploader.useFileUpload('image');
    const [uploadError, setUploadError] = React.useState(null);
    const [readOnly, setReadOnly] = React.useState(() => !editor.isEditable());
    React.useEffect(() => editor.registerEditableListener(editable => setReadOnly(!editable)), [editor]);

    // the title and subtitle are only typed into while the card is being edited
    React.useEffect(() => {
        headerTextEditor.setEditable(Boolean(isEditing));
        subheaderTextEditor.setEditable(Boolean(isEditing));
    }, [isEditing, headerTextEditor, subheaderTextEditor]);

    const update = (changes) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!node) {
                return;
            }
            for (const field of NODE_FIELDS) {
                if (changes[field] !== undefined) {
                    node[field] = changes[field];
                }
            }
            if (changes.title !== undefined) {
                setNestedText(node.getWritable(), '__headerTextEditor', headerTextEditor, changes.title);
            }
            if (changes.subtitle !== undefined) {
                setNestedText(node.getWritable(), '__subheaderTextEditor', subheaderTextEditor, changes.subtitle);
            }
        });
    };

    const uploadBackgroundImage = async (file) => {
        setUploadError(null);
        let result = null;
        try {
            result = await imageUploader.upload([file]);
        } catch (e) {
            console.error('Header background upload failed', e);
        }
        const url = result?.[0]?.url;
        if (!url) {
            setUploadError(strings.header.uploadError);
            return;
        }
        let size = {width: null, height: null};
        try {
            size = await getImageDimensions(url);
        } catch (e) {
            // the image is kept without its size
        }
        update({backgroundImageSrc: url, backgroundImageWidth: size.width, backgroundImageHeight: size.height});
    };

    const common = {
        alignment,
        backgroundColor,
        backgroundImageSrc,
        buttonColor,
        buttonEnabled,
        buttonEmoji,
        buttonText,
        buttonTextColor,
        buttonUrl,
        isEditing: Boolean(isEditing),
        isSelected: Boolean(isSelected),
        layout,
        readOnly,
        subtitle: textOf(subheaderTextEditor),
        subtitleField: (
            <KoenigCaptionEditor
                captionEditor={subheaderTextEditor}
                captionEditorInitialState={subheaderTextEditorInitialState}
                placeholderText={strings.header.subtitlePlaceholder}
            />
        ),
        textColor,
        title: textOf(headerTextEditor),
        titleField: (
            <KoenigCaptionEditor
                captionEditor={headerTextEditor}
                captionEditorInitialState={headerTextEditorInitialState}
                placeholderText={strings.header.titlePlaceholder}
            />
        ),
        update,
        uploadBackgroundImage,
        uploadError
    };

    const Custom = cardRenderers?.header;
    if (Custom) {
        return (
            <div data-kg-card="header" data-kg-header-custom>
                <Custom {...common} />
            </div>
        );
    }

    return <KoenigHeaderCard {...common} />;
}

function setNestedText(node, property, nestedEditor, text) {
    nestedEditor.update(() => $getRoot().clear(), {discrete: true});
    if (text) {
        populateNestedEditor(node, property, escapeHtml(text));
    }
}

export default HeaderNodeComponent;
