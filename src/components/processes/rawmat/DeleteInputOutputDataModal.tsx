import { Modal, Button } from "antd";
import { MdError } from "react-icons/md";

interface DeleteInputOutputDataModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: (resourceType: "input" | "output" | null) => void;
  // inputOutputDataToDelete: InputOutputData | null;
  loading: boolean;
  resourceType: "input" | "output" | null;
}

const DeleteInputOutputDataModal = ({
  visible,
  onClose,
  onDelete,
  // inputOutputDataToDelete,
  loading,
  resourceType,
}: DeleteInputOutputDataModalProps) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <MdError size={32} color="#E20301" />
          <span className="text-16">
            Delete {resourceType?.charAt(0).toUpperCase()}
            {resourceType?.slice(1)} Data
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          danger
          key="confirm"
          type="primary"
          onClick={() => onDelete(resourceType)}
          loading={loading}>
          Delete
        </Button>,
      ]}
      centered>
      <div className="text-16 mb-4 ml-8">
        <div className="bg-primary-100">
          Are you sure you want to delete this {resourceType} data?
        </div>
      </div>
    </Modal>
  );
};

export default DeleteInputOutputDataModal;
