import AudioCardIcon from '../assets/icons/kg-card-type-audio.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MediaNodeComponent from './MediaNodeComponent';
import {AudioNode as BaseAudioNode} from '#kg-default-nodes';
import {createCommand} from 'lexical';

export const INSERT_AUDIO_COMMAND = createCommand();

export class AudioNode extends BaseAudioNode {
    // Lexical expects every registered class to declare these itself; the base class's
    // versions already build `this`, so they only need passing through.
    static getType() {
        return super.getType();
    }

    static clone(node) {
        return super.clone(node);
    }

    static importJSON(serializedNode) {
        return super.importJSON(serializedNode);
    }

    __triggerFileDialog = false;
    __initialFile = null;

    static kgMenu = [{
        label: 'Audio',
        desc: 'Upload an audio file',
        Icon: AudioCardIcon,
        insertCommand: INSERT_AUDIO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['audio'],
        priority: 13,
        shortcut: '/audio'
    }];

    static uploadType = 'audio';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return AudioCardIcon;
    }

    set triggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <MediaNodeComponent
                    initialFile={this.__initialFile}
                    kind="audio"
                    nodeKey={this.getKey()}
                    src={this.src}
                    textValue={this.title}
                    trackLabel={this.trackLabel}
                    trackLang={this.trackLang}
                    trackSrc={this.trackSrc}
                    transcript={this.transcript}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createAudioNode = (dataset) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node) {
    return node instanceof AudioNode;
}
