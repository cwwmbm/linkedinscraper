<script>
	import { createEventDispatcher } from 'svelte';

	export let jobs = [];
	export let selectedJob = null;
	
	const dispatch = createEventDispatcher();

	function selectJob(job) {
		dispatch('selectJob', job);
	}

	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	function getCountry(location) {
		if (!location) return 'N/A';
		// Extract country from location string (assuming format like "City, Country" or just "Country")
		const parts = location.split(',');
		return parts[parts.length - 1].trim();
	}

	function getRateFromMetadata(job) {
		if (!job.metadata) return null;
		try {
			const metadata = JSON.parse(job.metadata);
			const rate = metadata.Rate || metadata.rate;
			// Only return rate if it's not "?" or similar non-informative values
			if (rate && rate.trim() !== '?' && rate.trim() !== 'N/A' && rate.trim() !== '') {
				return rate;
			}
		} catch (e) {
			// Invalid JSON, ignore
		}
		return null;
	}

	// TODO: This is very specific info that we should not hardcode like this - will be addressed in the future
	function getRemoteBelgiumFromMetadata(job) {
		if (!job.metadata) return null;
		try {
			const metadata = JSON.parse(job.metadata);
			const answer = metadata['Remote from Belgium?'];
			// Return the answer if it exists
			if (answer && answer.trim() !== '') {
				return answer;
			}
		} catch (e) {
			// Invalid JSON, ignore
		}
		return null;
	}

	async function toggleJobVisibility(job, event) {
		// Stop propagation to prevent selecting the job when clicking hide button
		event.stopPropagation();

		const isHidden = job.hidden;
		const endpoint = isHidden ? 'unhide_job' : 'hide_job';

		try {
			const response = await fetch(`/api/${endpoint}/${job.id}`, {
				method: 'POST'
			});

			if (response.ok) {
				job.hidden = isHidden ? 0 : 1;
				// Trigger reactivity
				jobs = jobs;
				// Dispatch event to notify parent
				dispatch('jobUpdated', {
					id: job.id,
					updatedFields: { hidden: job.hidden },
					fullJob: job
				});
			}
		} catch (error) {
			console.error(`Error toggling job visibility: ${error.message}`);
		}
	}
</script>

<div class="job-list">
	{#if jobs.length === 0}
		<div class="no-jobs">
			<p>No jobs found</p>
		</div>
	{:else}
		<div class="jobs-container">
			{#each jobs as job}
				<div
					class="job-item"
					class:selected={selectedJob && selectedJob.id === job.id}
					class:hidden={job.hidden}
					on:click={() => selectJob(job)}
					on:keydown={(e) => e.key === 'Enter' && selectJob(job)}
					tabindex="0"
					role="button"
				>
					<div class="job-header">
						<div class="job-title">{job.title || 'N/A'}</div>
						<div class="job-actions">
							{#if job.job_url}
								<a
									href={job.job_url}
									target="_blank"
									rel="noopener noreferrer"
									class="job-link"
									title="Open job posting"
									on:click|stopPropagation
								>
									🔗
								</a>
							{/if}
							<button
								class="hide-btn"
								class:hidden={job.hidden}
								on:click={(e) => toggleJobVisibility(job, e)}
								title={job.hidden ? "Unhide job" : "Hide job"}
							>
								{job.hidden ? '👁️' : '👁️‍🗨️'}
							</button>
							<div class="job-status">
								{#if job.applied}
									<span class="status applied" title="Applied">A</span>
								{/if}
								{#if job.interview}
									<span class="status interview" title="Interview">I</span>
								{/if}
								{#if job.rejected}
									<span class="status rejected" title="Rejected">R</span>
								{/if}
								{#if job.blocked}
									<span class="status blocked" title="Blocked">B</span>
								{/if}
								{#if job.metadata}
									<span class="status analyzed" title="Analyzed">✓</span>
								{/if}
								{#if job.hidden}
									<span class="status hidden" title="Hidden">H</span>
								{/if}
							</div>
						</div>
					</div>
					
					<div class="job-company-row">
						<span class="job-company">{job.company || 'N/A'}</span>
						{#if getRateFromMetadata(job)}
							<span class="job-rate">{getRateFromMetadata(job)}</span>
						{/if}
					</div>
					<div class="job-meta">
						<span class="job-country">{getCountry(job.location)}</span>
						<span class="job-date">{formatDate(job.date)}</span>
					</div>
					{#if getRemoteBelgiumFromMetadata(job)}
						<div class="job-remote-belgium">
							<span class="remote-label">Remote BE:</span>
							<span class="remote-answer">{getRemoteBelgiumFromMetadata(job)}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.job-list {
		height: 100%;
		display: flex;
		flex-direction: column;
		background-color: white;
		border-radius: 8px;
		border: 1px solid #e1e5e9;
	}

	.no-jobs {
		text-align: center;
		padding: 3rem 1rem;
		color: #666;
		font-size: 1rem;
	}

	.jobs-container {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.job-item {
		padding: 1rem;
		margin-bottom: 0.5rem;
		border: 1px solid #e1e5e9;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		background-color: white;
	}

	.job-item:hover {
		background-color: #f8f9fa;
		border-color: #0a66c2;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.job-item.selected {
		background-color: #e3f2fd;
		border-color: #0a66c2;
		box-shadow: 0 2px 8px rgba(10, 102, 194, 0.2);
	}

	.job-item.hidden {
		opacity: 0.6;
		background-color: #f8f9fa;
	}

	.job-item.hidden .job-title {
		text-decoration: line-through;
		color: #6c757d;
	}

	.job-item:focus {
		outline: 2px solid #0a66c2;
		outline-offset: 2px;
	}

	.job-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.job-title {
		color: #0a66c2;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.3;
		flex: 1;
		margin-right: 0.5rem;
		/* Clamp to 2 lines */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.job-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.job-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		text-decoration: none;
		border-radius: 4px;
		transition: background-color 0.2s ease;
		font-size: 14px;
	}

	.job-link:hover {
		background-color: rgba(10, 102, 194, 0.1);
	}

	.hide-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s ease;
		font-size: 14px;
		padding: 0;
	}

	.hide-btn:hover {
		background-color: rgba(220, 53, 69, 0.1);
		transform: scale(1.1);
	}

	.hide-btn.hidden {
		background-color: rgba(40, 167, 69, 0.1);
	}

	.hide-btn.hidden:hover {
		background-color: rgba(40, 167, 69, 0.2);
	}

	.job-status {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.status {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: bold;
		color: white;
	}

	.status.applied {
		background-color: #28a745;
	}

	.status.interview {
		background-color: #007bff;
	}

	.status.rejected {
		background-color: #dc3545;
	}

	.status.analyzed {
		background-color: #ffc107;
		color: #212529;
	}

	.status.hidden {
		background-color: #6c757d;
		color: white;
	}

	.status.blocked {
		background-color: #6f42c1;
		color: white;
	}

	.job-company-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.job-company {
		font-weight: 500;
		color: #333;
	}

	.job-rate {
		font-weight: 600;
		color: #28a745;
		font-size: 0.85rem;
	}

	.job-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
		color: #666;
	}

	.job-country {
		font-weight: 500;
	}

	.job-date {
		font-style: italic;
	}

	.job-remote-belgium {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e1e5e9;
		font-size: 0.8rem;
	}

	.remote-label {
		font-weight: 600;
		color: #0a66c2;
	}

	.remote-answer {
		color: #333;
		font-weight: 500;
	}

	/* Scrollbar styling */
	.jobs-container::-webkit-scrollbar {
		width: 6px;
	}

	.jobs-container::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 3px;
	}

	.jobs-container::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 3px;
	}

	.jobs-container::-webkit-scrollbar-thumb:hover {
		background: #a8a8a8;
	}

	/* Mobile: Horizontal scrolling */
	@media (max-width: 768px) {
		.job-list {
			border-radius: 4px;
		}

		.jobs-container {
			display: flex;
			flex-direction: row;
			gap: 0.75rem;
			overflow-x: auto;
			overflow-y: hidden;
			padding: 0.75rem;
			/* Smooth scrolling on mobile */
			-webkit-overflow-scrolling: touch;
			scroll-snap-type: x mandatory;
			scroll-padding: 0.75rem;
		}

		.job-item {
			flex: 0 0 280px;
			width: 280px;
			margin-bottom: 0;
			scroll-snap-align: start;
			/* Ensure cards are fully visible */
			min-width: 280px;
		}

		.job-title {
			font-size: 0.9rem;
		}

		.job-company-row {
			font-size: 0.85rem;
		}

		.job-meta {
			font-size: 0.75rem;
		}

		.job-remote-belgium {
			font-size: 0.75rem;
			margin-top: 0.4rem;
			padding-top: 0.4rem;
		}

		/* Horizontal scrollbar styling */
		.jobs-container::-webkit-scrollbar {
			height: 6px;
			width: auto;
		}
	}

	@media (max-width: 480px) {
		.job-item {
			flex: 0 0 260px;
			width: 260px;
			min-width: 260px;
		}
	}
</style>