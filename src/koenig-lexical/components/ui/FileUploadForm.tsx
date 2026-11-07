export function FileUploadForm({onFileChange, fileInputRef, accept}) {
    return (
        <form onChange={onFileChange}>
            <input
                ref={fileInputRef}
                accept={accept}
                hidden={true}
                name="file-input"
                type='file'
            />
        </form>
    );
}

export default FileUploadForm;
