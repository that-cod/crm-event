import ImageUpload from "@/components/ImageUpload";

type ItemImagesProps = {
    isEditing: boolean;
    images: (string)[];
    itemName: string;
    formData: {
        imageUrl1: string;
        imageUrl2: string;
        imageUrl3: string;
    };
    onImageUpdate: (field: "imageUrl1" | "imageUrl2" | "imageUrl3", url: string) => void;
};

export default function ItemImages({
    isEditing,
    images,
    itemName,
    formData,
    onImageUpdate,
}: ItemImagesProps) {
    if (isEditing) {
        return (
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Item Images (Up to 3)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ImageUpload
                        currentImageUrl={formData.imageUrl1}
                        onImageUploaded={(url) => onImageUpdate("imageUrl1", url)}
                        label="Image 1 (Primary)"
                    />
                    <ImageUpload
                        currentImageUrl={formData.imageUrl2}
                        onImageUploaded={(url) => onImageUpdate("imageUrl2", url)}
                        label="Image 2"
                    />
                    <ImageUpload
                        currentImageUrl={formData.imageUrl3}
                        onImageUploaded={(url) => onImageUpdate("imageUrl3", url)}
                        label="Image 3"
                    />
                </div>
            </div>
        );
    }

    if (images.length === 0) return null;

    return (
        <div className="card">
            <h2 className="text-lg font-semibold mb-4">Item Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {images.map((url, index) => (
                    <div key={index} className="relative">
                        <img
                            src={url}
                            alt={`${itemName} - Image ${index + 1}`}
                            className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                        />
                        {index === 0 && (
                            <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                                Primary
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
