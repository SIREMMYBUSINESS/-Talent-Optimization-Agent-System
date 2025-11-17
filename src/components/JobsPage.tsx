import React, { useState } from "react";
import EditJobModal from "../components/EditJobModal";

const sampleJob = {
  id: "job-123",
  title: "Frontend Engineer",
  description: "Build and maintain UI components.",
  status: "published",
};

export default function JobsPage() {
  const [showModal, setShowModal] = useState(false);
  const [job, setJob] = useState(sampleJob);

  const handleSave = (updatedJob: any) => {
    setJob(updatedJob);
    console.log("Updated job:", updatedJob);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Jobs</h1>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Edit Job
      </button>

      <EditJobModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        job={job}
        onSave={handleSave}
      />
    </div>
  );
}
