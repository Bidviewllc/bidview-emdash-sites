(function($){
	
	const AudiologistHandler = {
		
		init: function() {
			this.processAudiologistLocationById()
			
		},
		
		data: {
			action: 'process_audiologist_location',
			security: ba_ajax_object.nonce
		},
		
		processAudiologistLocationById: function() {
			
			let audiologistItems = $('.audiologist-has-locations').find('.audiologist-item')
			
			//console.log(audiologistItems);
			
			audiologistItems.each((index, item) => {
				let element = $(item).find('.astro-element')
				let id = element.attr('id'); 			
				this.processAudiologistLocationByIdAjaxHandler(id, element);
			});

		},
		processAudiologistLocationByIdAjaxHandler: function(audiologist_id, element){
			
			let data = {
				...this.data,
				audiologist_id
			};	
					
			$.ajax({
				type: "POST",
				dataType: "json",
				url: ba_ajax_object.ajax_url,
				data: data,
				success: function(response) {
					$('#'+ audiologist_id ).parent().append(response.data.result);
					//console.log(response.result)
				},
				error: function(request, status, error){
					console.log(status, error)
				}
			});
		}
		
    };

    AudiologistHandler.init()
	
})(jQuery)
