/**
 * Created by dsichau on 05.03.16.
 */


$(document).ready(function(){
    ajaxMailChimpForm($("#subscribe-form"), $(".mc-field-group"));
    // Turn the given MailChimp form into an ajax version of it.
    // If resultElement is given, the subscribe result is set as html to
    // that element.
    function ajaxMailChimpForm($form, $resultElement){
        // Hijack the submission. We'll submit the form manually.
        $form.submit(function(e) {
            e.preventDefault();
            if (!isValidEmail($form)) {
                $resultElement.removeClass("has-success").addClass("has-error");
                $resultElement.find("#emailError").show()
            } else {
                $resultElement.removeClass("has-error").addClass("has-success");
                $resultElement.find("#subscribing").show()
                submitSubscribeForm($form, $resultElement);
            }
        });
    }
    // Validate the email address in the form
    function isValidEmail($form) {
        // If email is empty, show error message.
        // contains just one @
        var email = $form.find("input[type='email']").val();
        var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
    }
    // Submit the form with an ajax/jsonp request.
    // Based on http://stackoverflow.com/a/15120409/215821
    function submitSubscribeForm($form, $resultElement) {
        $.ajax({
            type: "GET",
            url: $form.attr("action"),
            data: $form.serialize(),
            cache: false,
            dataType: "jsonp",
            jsonp: "c", // trigger MailChimp to return a JSONP response
            contentType: "application/json; charset=utf-8",
            error: function(error){
                // According to jquery docs, this is never called for cross-domain JSONP requests
            },
            success: function(data){
                $resultElement.find(".help-block").hide();
                if (data.result != "success") {
                    console.log(data.msg);
                    var message = data.msg || "Sorry. Unable to subscribe. Please try again later.";
                    if (data.msg && data.msg.indexOf("already subscribed") >= 0) {
                        console.log(data.msg);
                        $resultElement.removeClass("has-error").addClass("has-success");
                        $resultElement.find("#alreadySubscribed").show()
                    }
                    $resultElement.removeClass("has-success").addClass("has-error");
                    $resultElement.find("#unableToSubscribe").html(message).show()
                } else {
                    $resultElement.removeClass("has-error").addClass("has-success");
                    $resultElement.find("#success").show()
                }
            }
        });
    }
});