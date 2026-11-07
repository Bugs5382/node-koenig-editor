import FileCardIcon from '../assets/icons/kg-card-type-file.svg?react';
import FileNodeComponent from './FileNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {FileNode as BaseFileNode} from '#kg-default-nodes';
import {createCommand} from 'lexical';

export const INSERT_FILE_COMMAND = createCommand();

export class FileNode extends BaseFileNode {
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
        label: 'File',
        desc: 'Upload a downloadable file',
        Icon: FileCardIcon,
        insertCommand: INSERT_FILE_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['file'],
        priority: 15,
        shortcut: '/file'
    }];

    static uploadType = 'file';

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFile} = dataset;

        // don't trigger the file dialog when rendering if we've already been given a url
        this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false;
        this.__initialFile = initialFile || null;
    }

    getIcon() {
        return FileCardIcon;
    }

    set triggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <FileNodeComponent
                    fileDesc={this.fileCaption}
                    fileName={this.fileName}
                    fileSize={this.formattedFileSize}
                    fileSrc={this.src}
                    fileTitle={this.fileTitle}
                    showIcon={this.showIcon}
                    initialFile={this.__initialFile}
                    nodeKey={this.getKey()}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createFileNode = (dataset) => {
    return new FileNode(dataset);
};

export function $isFileNode(node) {
    return node instanceof FileNode;
}
