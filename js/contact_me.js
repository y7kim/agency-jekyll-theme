$(function() {
    $("input,textarea").jqBootstrapValidation({
        preventSubmit: true,
        submitError: function($form, event, errors) {
            // additional error messages or events
        },
        submitSuccess: function($form, event) {
            event.preventDefault(); // prevent default submit behaviour
            // get values from FORM
            var name = $("input#name").val();
            var email = $("input#email").val();
            var phone = $("input#phone").val();
            var message = $("textarea#message").val();
			var email_body = "You have received a new message from your website contact form.\n\n" + 
				"Here are the details:\n\nName: " + name + 
				"\n\nEmail: " + email +
				"\n\nPhone: " + phone + 
				"\n\nMessage:\n" + message
			
            var firstName = name; // For Success/Failure Message
            // Check for white space in name for Success/Fail message
            if(firstName.indexOf(' ') >= 0) {
                firstName = name.split(' ').slice(0, -1).join(' ');
            }
            $.ajax({
                url: "https://mandrillapp.com/api/1.0/messages/send.json",
                type: "POST",
                data: {
                    'key': '56Y39zNqNOgZrNNXRkAA1w',
                    'message': {
                        'from_email': "halcyonlabsllc@gmail.com",
                        'from_name': "Halcyon Labs Web Contact",
                        'headers': {
                            'Reply-To': email
                        },
                        'subject': "Website Contact Form: " + name,
                        'text': email_body,
                        'to': [{
                            'email': 'scott.swarthout724@gmail.com',
                            'name': 'Scott Swarthout',
                            'type': 'to'
                        }]
                    }
                },
                cache: false,
                success: function() {
                    // Success message
                    $('#success').html("<div class='alert alert-success'>");
                    $('#success > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;").append("</button>");
                    $('#success > .alert-success').append("<strong>Your message has been sent. </strong>");
                    $('#success > .alert-success').append('</div>');
                    //clear all fields
                    $('#contactForm').trigger("reset");
                },
                error: function() {
                    // Fail message
                    $('#success').html("<div class='alert alert-danger'>");
                    $('#success > .alert-danger').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;").append("</button>");
                    $('#success > .alert-danger').append("<strong>Sorry " + firstName + ", it seems that my mail server is not responding. Please try again later!");
                    $('#success > .alert-danger').append('</div>');
                    //clear all fields
                    $('#contactForm').trigger("reset");
                },
            })
        },
        filter: function() {
            return $(this).is(":visible");
        },
    });
    $("a[data-toggle=\"tab\"]").click(function(e) {
        e.preventDefault();
        $(this).tab("show");
    });
});
/*When clicking on Full hide fail/success boxes */
$('#name').focus(function() {
    $('#success').html('');
});
/*When clicking on Full hide fail/success boxes */
$('#name').focus(function() {
    $('#success').html('');
});