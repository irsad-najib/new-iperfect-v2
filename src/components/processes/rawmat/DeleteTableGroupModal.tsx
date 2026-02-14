import { Modal, Button } from "antd";
import { MdError } from "react-icons/md";

interface TableItem {
  _id: string;
  name: string;
}

interface TableGroup {
  name: string;
  table_items: TableItem[];
}

interface DeleteTableGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: (tableGroup: TableGroup | null) => void;
  tableGroupToDelete: TableGroup | null;
  loading: boolean;
}

const DeleteTableGroupModal = ({
  visible,
  onClose,
  onDelete,
  tableGroupToDelete,
  loading,
}: DeleteTableGroupModalProps) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <MdError size={32} color="#E20301" />
          <span className="text-16">Delete Table Group</span>
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
          onClick={() => onDelete(tableGroupToDelete)}
          loading={loading}>
          Delete
        </Button>,
      ]}
      centered>
      <div className="text-16 mb-4 ml-8">
        <div className="text-neutral-900">
          Are you sure you want to delete this table group?
        </div>
      </div>
    </Modal>
  );
};

export default DeleteTableGroupModal;
