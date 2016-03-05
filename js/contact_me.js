
$(function() {

    $("#contact>input, #contact>textarea").jqBootstrapValidation({
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
            var gotcha = $("input#_gotcha").val();
            var message = $("textarea#message").val();
            var firstName = name; // For Success/Failure Message
            // Check for white space in name for Success/Fail message
            $.ajax({
                url: "http://mailthis.to/pele",
                method: "POST",
                data: {
                    name: name,
                    phone: phone,
                    email: email,
                    message: message,
                    _honey: gotcha
                },
                dataType: "json",
                cache: false,
                complete: function(data) {
                    console.log("success");
                    console.log(data);
                    if(data.status === 200) {
                        // Success message
                        $('#successMessage').html("<div class='alert alert-success'>");
                        $('#successMessage > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
                            .append("</button>");
                        $('#successMessage > .alert-success')
                            .append("<strong>")
                        $('#successMessage > .alert-success')
                            .append(firstName)
                        $('#successMessage > .alert-success')
                            .append(", thank you for your message.</strong>");
                        $('#successMessage > .alert-success')
                            .append('</div>');
                    } else {
                        $('#successMessage').html("<div class='alert alert-danger'>");
                        $('#successMessage > .alert-danger').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
                            .append("</button>");
                        $('#successMessage > .alert-danger').append("<strong>Sorry , it seems that my mail server is not responding. Please try again later!");
                        $('#successMessage > .alert-danger').append('</div>');
                    }
                    //clear all fields
                    $('#contactForm').trigger("reset");
                }
            })
        },
        filter: function() {
            return $(this).is(":visible");
        }
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
