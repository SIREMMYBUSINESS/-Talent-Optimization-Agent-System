// src/components/EditJobModal.tsx
import React, { useState } from "react";
import Modal from "./Modal";

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
  onSave: (updatedJob: any) => void;
}

export default function EditJobModal({ isOpen, onClose, job, onSave }: EditJobModalProps) {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [status, setStatus] = useState(job.status);

  const handleSave = () => {
    onSave({ ...job, title, description, status });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Job Posting">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </Modal>
  );
}
