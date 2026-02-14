import { Modal, Button } from "antd";
import { MdError } from "react-icons/md";

interface NextStepModalProps {
  visible: boolean;
  onClose: () => void;
  onNext: () => void;
}

const NextStepModal = ({ visible, onClose, onNext }: NextStepModalProps) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <MdError size={32} color="#F47920" />
          <span className="font-16">Are you sure to continue?</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="confirm" type="primary" onClick={() => onNext()}>
          Next
        </Button>,
      ]}
      centered
      width={317}
      closable={false}>
      <div className="font-16 mb-4 ml-8">
        <div className="bg-primary-300 ml-2">
          Missing a single input or output can be fatal
        </div>
      </div>
    </Modal>
  );
};

export default NextStepModal;
