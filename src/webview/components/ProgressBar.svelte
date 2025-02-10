<script lang="ts">
	let { percentage = 0 } = $props<{ percentage: number }>();
	const clampedPercentage = $derived(Math.min(Math.max(percentage, 0), 100));
</script>

<div class="monaco-progress-container">
	<div
		class="monaco-progress-bar"
		style={`transform: scaleX(${clampedPercentage / 100})`}
		role="progressbar"
		aria-valuenow={clampedPercentage}
		aria-valuemin="0"
		aria-valuemax="100"
	></div>
</div>

<style>
	.monaco-progress-container {
		display: block;
		position: relative;
		width: 100%;
		height: 4px;
		background: var(--vscode-panel-border);
		border-radius: 2px;
		margin: 0.25rem 0;
		overflow: hidden;
	}

	.monaco-progress-bar {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: var(--vscode-button-background);
		transform-origin: left;
	}
</style> 