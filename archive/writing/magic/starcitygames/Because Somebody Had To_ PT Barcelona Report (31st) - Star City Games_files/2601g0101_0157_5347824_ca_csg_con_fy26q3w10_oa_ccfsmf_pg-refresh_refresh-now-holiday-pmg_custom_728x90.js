var banner = document.getElementById('banner');
var legal = document.getElementById('roll-cta');

var tl = gsap.timeline({repeat:0, repeatDelay:1.8});
gsap.defaults({
  ease:Quad.easeInOut,
  force3D:false,
  duration:0.5
});

window.onload = function() {	

	tl.set(banner, {visibility: "visible"})

	/*frame one*/	
	.from(".title1-1, .dell-ell1,.txt-cont1", .3,  {autoAlpha: 0, stagger: 0.1, x:"-20%"}, "frame1")	
	.to(".title1,.txt-cont1", {autoAlpha: 0}, "frame1+=2.7")
	.to(".f1-bg", {left:"-100%", ease: "sine.inOut"}, "frame1+=3.5")	

	/*frame two*/	
	.add("frame2","frame1+=3")	
	.from(".f2-bg-left", { left:"-100%", ease: "sine.inOut"}, "frame2+=0.25")
	.from(".f2-bg-right", .75, { left:"100%", ease: "sine.inOut"}, "frame2")
	.to(".dell-logo", .3, {webkitFilter: "brightness(0)", filter: "brightness(0)"}, "frame2+=0.2")
	.from(".title2-1, .dell-ell2", .3,  {autoAlpha: 0, stagger: 0.1, x:"-20%"}, "frame2+=.5")
	.to(".title2", {autoAlpha: 0, }, "frame2+=2.7")
	.to(".f2-bg-left", {left:"-100%", ease: "sine.inOut" }, "frame2+=3.5")		
	.to(".f2-bg-right", {left:"100%", ease: "sine.inOut"}, "frame2+=3.5")	


	/*frame three*/
	.add("frame3","frame2+=3")	
	.from(".f3-bg",  { top:"-100%", ease: "sine.inOut"}, "frame3")
	.to(".dell-logo", .3,  {webkitFilter: "brightness(1)", filter: "brightness(1)"}, "frame3")
	.from(".title3-1, .title3-2,  .dell-ell3, .proname-3,.txt-cont3", .3,  {autoAlpha: 0, stagger: 0.1, x:"-20%"}, "frame3+=.5")
	.to(".title3,.txt-cont3", {autoAlpha: 0, }, "frame3+=2.7")	
	.to(".f3-bg", {left:"-100%", ease: "sine.inOut"}, "frame3+=3.5")		

	/*frame four*/
	.add("frame4","frame3+=3")
	.from(".f4-bg-left",  { left:"-100%", ease: "sine.inOut"}, "frame4")	
	.from(".f4-bg-right",  { left:"100%", ease: "sine.inOut"}, "frame4")
	.to(".dell-logo", {webkitFilter: "brightness(0)", filter: "brightness(0)"}, "frame4")
	.from(".title4-1, .title4-2, .dell-ell4, .proname-4", .3,  {autoAlpha: 0, stagger: 0.1, x:"-20%"}, "frame4+=.5")
	.to(".title4", {autoAlpha: 0, }, "frame4+=2.7")		
	.to(".f4-bg-left", {left:"-100%", ease: "sine.inOut" }, "frame4+=3.5")		
	.to(".f4-bg-right", {left:"100%", ease: "sine.inOut"}, "frame4+=3.5")	

	/*frame five*/
	.add("frame5","frame4+=3")
	.from(".f5-bg",  { top:"100%", ease: "sine.inOut"}, "frame5")
	.to(".dell-logo", {webkitFilter: "brightness(1)", filter: "brightness(1)"}, "frame5")
	.from(".title5-1, .title5-2, .dell-ell5", .3,  {autoAlpha: 0, stagger: 0.1, x:"-20%"}, "frame5+=.5")	
	.from(".cta, .funding-copy",  {autoAlpha: 0}, "frame5+=.5")		

	
	;

	// tl.pause(14)
	var currentDuration = tl.duration();
	var repeatDelay  = tl.repeatDelay();
	console.log(currentDuration + repeatDelay); 

};
