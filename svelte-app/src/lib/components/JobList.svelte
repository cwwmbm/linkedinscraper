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
							{#if job.metadata}
								<span class="status analyzed" title="Analyzed">✓</span>
							{/if}
							{#if job.hidden}
								<span class="status hidden" title="Hidden">H</span>
							{/if}
						</div>
					</div>
					
					<div class="job-company">{job.company || 'N/A'}</div>
					<div class="job-meta">
						<span class="job-country">{getCountry(job.location)}</span>
						<span class="job-date">{formatDate(job.date)}</span>
					</div>
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

	.job-company {
		font-weight: 500;
		color: #333;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
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
</style>