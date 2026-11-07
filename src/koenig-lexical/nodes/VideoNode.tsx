import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MediaNodeComponent from './MediaNodeComponent';
import VideoCardIcon from '../assets/icons/kg-card-type-video.svg?react';
import {VideoNode as BaseVideoNode} from '#kg-default-nodes';
import {createCommand} from 'lexical';

export const INSERT_VIDEO_COMMAND = createCommand();

export class VideoNode extends BaseVideoNode {
    // per-window upload state, not part of the card (see KoenigCollaboration)
    static collabLocalProperties = ['__initialFile', '__triggerFileDialog'];

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
        label: 'Video',
        desc: 'Upload a video file',
        Icon: VideoCardIcon,
        insertCommand: INSERT_VIDEO_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['video'],
        priority: 14,
        shortcut: '/video'
    }];

    static uploadType = 'video';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return VideoCardIcon;
    }

    set triggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.cardWidth}>
                <MediaNodeComponent
                    height={this.height}
                    initialFile={this.__initialFile}
                    kind="video"
                    nodeKey={this.getKey()}
                    src={this.src}
                    textValue={this.caption}
                    trackLabel={this.trackLabel}
                    trackLang={this.trackLang}
                    trackSrc={this.trackSrc}
                    transcript={this.transcript}
                    triggerFileDialog={this.__triggerFileDialog}
                    width={this.width}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createVideoNode = (dataset) => {
    return new VideoNode(dataset);
};

export function $isVideoNode(node) {
    return node instanceof VideoNode;
}
