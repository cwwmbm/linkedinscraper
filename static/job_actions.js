var selectedJob = null;

function showJobDetails(jobId) {
    if (selectedJob !== null) {
        selectedJob.classList.remove('job-item-selected');
    }
    console.log('Showing job details: ' + jobId); // Log the jobId here
    var newSelectedJob = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
    newSelectedJob.classList.add('job-item-selected');
    selectedJob = newSelectedJob;

    fetch('/job_details/' + jobId)
        .then(response => response.json())
        .then(data => updateJobDetails(data));
}

function updateJobDetails(job) {
    var jobDetailsDiv = document.getElementById('job-details');
    console.log('Updating job details: ' + job.id); // Log the jobId here
    var html = '<h2 class="job-title">' + job.title + '</h2>';
    html += '<div class="button-container" style="text-align:center">';
    html += '<a href="' + job.job_url + '" class="job-button">Go to job</a>';
    html += '<button class="job-button" onclick="markAsApplied(' + job.id + ')">Applied</button>';
    html += '<button class="job-button" onclick="markAsRejected(' + job.id + ')">Rejected</button>';
    html += '<button class="job-button" onclick="markAsInterview(' + job.id + ')">Interview</button>';
    html += '<button class="job-button" onclick="hideJob(' + job.id + ')">Hide</button>';
    html += '</div>';
    html += '<p class="job-detail">' + job.company + ', ' + job.location + '</p>';
    html += '<p class="job-detail">' + job.date + '</p>';
    html += '<p class="job-description">' + job.job_description + '</p>';

    jobDetailsDiv.innerHTML = html;
}


function markAsApplied(jobId) {
    console.log('Marking job as applied: ' + jobId)
    fetch('/mark_applied/' + jobId, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log(data);  // Log the response
            if (data.success) {
                var jobCard = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
                jobCard.classList.add('job-item-applied');
            }
        });
}

function markAsRejected(jobId) {
    console.log('Marking job as rejected: ' + jobId)
    fetch('/mark_rejected/' + jobId, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log(data);  // Log the response
            if (data.success) {
                var jobCard = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
                jobCard.classList.add('job-item-rejected');
            }
        });
}

function hideJob(jobId) {
    fetch('/hide_job/' + jobId, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                var jobCard = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
                
                // Find the next sibling in the DOM that is a job-item
                var nextJobCard = jobCard.nextElementSibling;
                while(nextJobCard && !nextJobCard.classList.contains('job-item')) {
                    nextJobCard = nextJobCard.nextElementSibling;
                }
                
                // If a next job exists, show its details
                if (nextJobCard) {
                    var nextJobId = nextJobCard.getAttribute('data-job-id');
                    showJobDetails(nextJobId);
                }
                
                // Hide the current job
                jobCard.style.display = 'none'; // Or you can remove it from DOM entirely

                // If no next job exists, clear the job details div
                if (!nextJobCard) {
                    var jobDetailsDiv = document.getElementById('job-details');
                    jobDetailsDiv.innerHTML = '';
                }
            }
        });
}


function markAsInterview(jobId) {
    console.log('Marking job as interview: ' + jobId)
    fetch('/mark_interview/' + jobId, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            console.log(data);  // Log the response
            if (data.success) {
                var jobCard = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
                jobCard.classList.add('job-item-interview');
            }
        });
}

